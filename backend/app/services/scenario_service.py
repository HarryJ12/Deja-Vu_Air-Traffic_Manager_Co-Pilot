from __future__ import annotations

from functools import cached_property

from app.core.dataset import DataBundle
from app.core.flight_interpolation import active_flight_positions
from app.core.geo import prepare_sectors
from app.core.risk_scoring import compute_risks
from app.core.schemas import Scenario, ScenarioStateResponse, ScenarioSummaryResponse
from app.core.sector_occupancy import compute_sector_occupancy
from app.core.time_bins import time_bin_midpoint
from app.core.weather_conflicts import compute_weather_conflicts, weather_overlay_refs


class ScenarioService:
    def __init__(self, bundle: DataBundle | None = None):
        self.bundle = bundle or DataBundle()

    @cached_property
    def prepared_sectors(self):
        return prepare_sectors(self.bundle.load_sectors())

    def list_scenarios(self) -> list[Scenario]:
        scenarios = []
        for scenario_id in self.bundle.scenario_ids():
            meta = self.bundle.scenario_summary_meta(scenario_id)
            scenarios.append(
                Scenario(
                    id=meta["id"],
                    asked_at=meta["asked_at"],
                    flight_count=meta["flight_count"],
                    time_bin_count=meta["time_bin_count"],
                    window_start=meta["window_start"],
                    window_end=meta["window_end"],
                )
            )
        return scenarios

    def scenario_summary(self, scenario_id: str) -> ScenarioSummaryResponse:
        meta = self.bundle.scenario_summary_meta(scenario_id)
        scenario = Scenario(
            id=meta["id"],
            asked_at=meta["asked_at"],
            flight_count=meta["flight_count"],
            time_bin_count=meta["time_bin_count"],
            window_start=meta["window_start"],
            window_end=meta["window_end"],
        )
        state = self.scenario_state(scenario_id, meta["initial_time_bin_id"], include_flights=False)
        return ScenarioSummaryResponse(
            scenario=scenario,
            sectors=self.bundle.load_sectors(),
            time_bins=self.bundle.time_bins(scenario_id),
            initial_time_bin_id=meta["initial_time_bin_id"],
            top_risks=state.risks,
        )

    def scenario_state(
        self,
        scenario_id: str,
        time_bin_id: str,
        include_flights: bool = True,
    ) -> ScenarioStateResponse:
        time_bin = self.bundle.time_bin_by_id(scenario_id, time_bin_id)
        at_time = time_bin_midpoint(time_bin)
        routes = self.bundle.load_routes(scenario_id)
        positions = active_flight_positions(routes["flights"], at_time)
        occupancy, flight_sector = compute_sector_occupancy(positions, self.prepared_sectors)
        refc = self.bundle.load_weather_matrix(scenario_id, "refc", time_bin_id)
        retop = self.bundle.load_weather_matrix(scenario_id, "retop", time_bin_id)
        conflicts = compute_weather_conflicts(positions, flight_sector, refc, retop)
        overlays = weather_overlay_refs(refc, retop, time_bin.valid_from, time_bin.valid_to, conflicts)
        risks = compute_risks(time_bin.label, occupancy, conflicts)
        return ScenarioStateResponse(
            time_bin=time_bin,
            flights=positions[:1000] if include_flights else [],
            sector_occupancy=occupancy[:80],
            weather_conflicts=conflicts[:300],
            weather_tiles=overlays,
            risks=risks,
        )
