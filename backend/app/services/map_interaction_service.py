from __future__ import annotations

from app.core.flight_interpolation import active_flight_positions
from app.core.geo import (
    find_sector,
    flight_id,
    haversine_nm,
    weather_index,
)
from app.core.risk_scoring import compute_risks
from app.core.schemas import (
    FlightDetailResponse,
    FlightPosition,
    LocationPoint,
    MapInspectionResponse,
    NearbyFlight,
    SectorDetailResponse,
    SectorMapSummary,
    TimeBin,
    WeatherSample,
)
from app.core.sector_occupancy import compute_sector_occupancy
from app.core.time_bins import time_bin_midpoint
from app.core.weather_conflicts import compute_weather_conflicts, sample_weather

from .scenario_service import ScenarioService


class MapInteractionService:
    def __init__(self, scenarios: ScenarioService | None = None):
        self.scenarios = scenarios or ScenarioService()

    def inspect_point(
        self,
        scenario_id: str,
        time_bin_id: str,
        lat: float,
        lon: float,
        altitude_ft: int | None = None,
        nearby_limit: int = 8,
    ) -> MapInspectionResponse:
        context = self._context(scenario_id, time_bin_id)
        sectors = self._sectors_at_point(lat, lon, altitude_ft, context["occupancy_lookup"])
        weather = self._weather_sample(context["refc"], context["retop"], lat, lon, altitude_ft)
        nearby = self._nearby_flights(
            context["positions"],
            context["flight_sector"],
            context["conflict_ids"],
            lat,
            lon,
            nearby_limit,
        )
        sector_ids = {sector.sector_id for sector in sectors}
        matching_risks = [risk for risk in context["risks"] if risk.sector_id in sector_ids]
        agents = self._recommended_agents(bool(sectors), bool(nearby), weather)
        narrative = self._point_narrative(sectors, weather, nearby)
        return MapInspectionResponse(
            scenario_id=scenario_id,
            time_bin=context["time_bin"],
            location=LocationPoint(lat=lat, lon=lon, altitude_ft=altitude_ft),
            sectors=sectors,
            weather=weather,
            nearby_flights=nearby,
            matching_risks=matching_risks,
            recommended_agents=agents,
            narrative=narrative,
        )

    def sector_detail(self, scenario_id: str, time_bin_id: str, sector_id: str) -> SectorDetailResponse:
        context = self._context(scenario_id, time_bin_id)
        occupancy = context["occupancy_lookup"].get(sector_id)
        if occupancy is None:
            sector = next((item for item in self.scenarios.prepared_sectors if item.sector_id == sector_id), None)
            if sector is None:
                raise KeyError(sector_id)
            occupancy = SectorMapSummary(
                sector_id=sector.sector_id,
                altitude_band=sector.altitude_band,  # type: ignore[arg-type]
                capacity=sector.capacity,
                count=0,
                utilization_pct=0.0,
                overload_count=0,
            )

        contributing_ids = set(occupancy.contributing_flight_ids if hasattr(occupancy, "contributing_flight_ids") else [])
        if not contributing_ids:
            contributing_ids = {
                position.flight_id
                for position in context["positions"]
                if context["flight_sector"].get(position.flight_id) == sector_id
            }
        flights = [position for position in context["positions"] if position.flight_id in contributing_ids][:80]
        conflicts = [conflict for conflict in context["conflicts"] if conflict.sector_id == sector_id]
        risks = [risk for risk in context["risks"] if risk.sector_id == sector_id]
        agents = ["Air Marshal"]
        if conflicts:
            agents.append("Weather Boy")
        if risks:
            agents.extend(["Domino", "Risko"])
        return SectorDetailResponse(
            scenario_id=scenario_id,
            time_bin=context["time_bin"],
            sector=self._sector_summary_from_any(occupancy),
            contributing_flights=flights,
            weather_conflicts=conflicts[:100],
            risks=risks,
            recommended_agents=agents,  # type: ignore[arg-type]
        )

    def flight_detail(self, scenario_id: str, time_bin_id: str, requested_flight_id: str) -> FlightDetailResponse:
        context = self._context(scenario_id, time_bin_id)
        flight = next((position for position in context["positions"] if position.flight_id == requested_flight_id), None)
        if flight is None:
            raise KeyError(requested_flight_id)
        sector_id = context["flight_sector"].get(flight.flight_id)
        weather = self._weather_sample(context["refc"], context["retop"], flight.lat, flight.lon, flight.altitude_ft)
        raw = next(
            item
            for item in self.scenarios.bundle.load_routes(scenario_id)["flights"]
            if flight_id(item) == requested_flight_id
        )
        route = [
            LocationPoint(lat=float(lat), lon=float(lon), altitude_ft=int(raw["cruise_altitude_ft"]))
            for lat, lon in zip(raw["lats"], raw["lons"])
        ]
        agents = ["Air Marshal"]
        if weather.conflict_at_altitude:
            agents.insert(0, "Weather Boy")
        return FlightDetailResponse(
            scenario_id=scenario_id,
            time_bin=context["time_bin"],
            flight=flight,
            sector_id=sector_id,
            weather=weather,
            route=route,
            recommended_agents=agents,  # type: ignore[arg-type]
        )

    def _context(self, scenario_id: str, time_bin_id: str) -> dict:
        time_bin = self.scenarios.bundle.time_bin_by_id(scenario_id, time_bin_id)
        at_time = time_bin_midpoint(time_bin)
        routes = self.scenarios.bundle.load_routes(scenario_id)
        positions = active_flight_positions(routes["flights"], at_time)
        occupancy, flight_sector = compute_sector_occupancy(positions, self.scenarios.prepared_sectors)
        refc = self.scenarios.bundle.load_weather_matrix(scenario_id, "refc", time_bin_id)
        retop = self.scenarios.bundle.load_weather_matrix(scenario_id, "retop", time_bin_id)
        conflicts = compute_weather_conflicts(positions, flight_sector, refc, retop)
        risks = compute_risks(time_bin.label, occupancy, conflicts)
        occupancy_lookup = {item.sector_id: item for item in occupancy}
        return {
            "time_bin": time_bin,
            "positions": positions,
            "occupancy": occupancy,
            "occupancy_lookup": occupancy_lookup,
            "flight_sector": flight_sector,
            "refc": refc,
            "retop": retop,
            "conflicts": conflicts,
            "conflict_ids": {conflict.flight_id for conflict in conflicts},
            "risks": risks,
        }

    def _sectors_at_point(
        self,
        lat: float,
        lon: float,
        altitude_ft: int | None,
        occupancy_lookup: dict,
    ) -> list[SectorMapSummary]:
        altitude_samples = [altitude_ft] if altitude_ft is not None else [34000, 35000]
        sectors = []
        seen = set()
        for altitude in altitude_samples:
            if altitude is None:
                continue
            sector = find_sector(lon, lat, altitude, self.scenarios.prepared_sectors)
            if not sector or sector.sector_id in seen:
                continue
            seen.add(sector.sector_id)
            occupancy = occupancy_lookup.get(sector.sector_id)
            if occupancy:
                sectors.append(self._sector_summary_from_any(occupancy))
            else:
                sectors.append(
                    SectorMapSummary(
                        sector_id=sector.sector_id,
                        altitude_band=sector.altitude_band,  # type: ignore[arg-type]
                        capacity=sector.capacity,
                        count=0,
                        utilization_pct=0.0,
                        overload_count=0,
                    )
                )
        return sectors

    def _sector_summary_from_any(self, item) -> SectorMapSummary:
        return SectorMapSummary(
            sector_id=item.sector_id,
            altitude_band=item.altitude_band,
            capacity=item.capacity,
            count=item.count,
            utilization_pct=item.utilization_pct,
            overload_count=item.overload_count,
        )

    def _weather_sample(self, refc, retop, lat: float, lon: float, altitude_ft: int | None) -> WeatherSample:
        if weather_index(lat, lon) is None:
            return WeatherSample()
        sample = sample_weather(refc, retop, lat, lon)
        if sample is None:
            return WeatherSample(severity="nodata")
        refc_value, retop_value = sample
        conflict = None
        severity = "none"
        if altitude_ft is not None:
            conflict = refc_value >= 40 and retop_value >= altitude_ft
            severity = "alert" if conflict and refc_value >= 50 else "watch" if conflict else "none"
        elif refc_value >= 40:
            severity = "watch"
        return WeatherSample(
            refc_dbz=round(refc_value, 1),
            retop_ft=round(retop_value, 0),
            conflict_at_altitude=conflict,
            severity=severity,  # type: ignore[arg-type]
        )

    def _nearby_flights(
        self,
        positions: list[FlightPosition],
        flight_sector: dict[str, str | None],
        conflict_ids: set[str],
        lat: float,
        lon: float,
        limit: int,
    ) -> list[NearbyFlight]:
        ranked = []
        for position in positions:
            distance = haversine_nm(lat, lon, position.lat, position.lon)
            ranked.append((distance, position))
        ranked.sort(key=lambda item: item[0])
        return [
            NearbyFlight(
                flight_id=position.flight_id,
                flight_number=position.flight_number,
                distance_nm=round(distance, 1),
                lat=round(position.lat, 5),
                lon=round(position.lon, 5),
                altitude_ft=position.altitude_ft,
                origin=position.origin,
                destination=position.destination,
                sector_id=flight_sector.get(position.flight_id),
                weather_conflict=position.flight_id in conflict_ids,
            )
            for distance, position in ranked[:limit]
        ]

    def _recommended_agents(
        self,
        has_sector: bool,
        has_nearby_flights: bool,
        weather: WeatherSample,
    ) -> list[str]:
        agents = ["Jarvis"]
        if has_sector:
            agents.append("Air Marshal")
        if weather.severity in {"watch", "alert"}:
            agents.append("Weather Boy")
        if has_nearby_flights:
            agents.append("Domino")
        agents.append("Risko")
        return agents

    def _point_narrative(
        self,
        sectors: list[SectorMapSummary],
        weather: WeatherSample,
        nearby: list[NearbyFlight],
    ) -> str:
        if not sectors and not nearby:
            return "No active sector or nearby flight concentration was found at this point."
        parts = []
        if sectors:
            top = max(sectors, key=lambda item: item.utilization_pct)
            parts.append(f"{top.sector_id} is at {top.utilization_pct}% utilization.")
        if weather.severity in {"watch", "alert"}:
            parts.append(f"Weather is {weather.severity} level at this point.")
        if nearby:
            parts.append(f"{len(nearby)} nearby active flights are available for inspection.")
        return " ".join(parts)
