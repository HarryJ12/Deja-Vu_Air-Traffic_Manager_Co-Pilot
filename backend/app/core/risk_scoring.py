from __future__ import annotations

from collections import Counter, defaultdict

from .schemas import RiskSummary, SectorOccupancy, WeatherConflict


def projected_delay_minutes(overload_count: int, weather_conflicts: int, downstream_pressure: int = 0) -> int:
    return overload_count * 7 + weather_conflicts * 4 + downstream_pressure * 3


def compute_risks(
    time_label: str,
    occupancy: list[SectorOccupancy],
    conflicts: list[WeatherConflict],
    max_items: int = 12,
) -> list[RiskSummary]:
    conflicts_by_sector = Counter(conflict.sector_id for conflict in conflicts if conflict.sector_id)
    conflict_ids_by_sector: dict[str, set[str]] = defaultdict(set)
    for conflict in conflicts:
        if conflict.sector_id:
            conflict_ids_by_sector[conflict.sector_id].add(conflict.flight_id)

    risks: list[RiskSummary] = []
    for item in occupancy:
        weather_count = conflicts_by_sector[item.sector_id]
        if item.utilization_pct < 75 and weather_count == 0:
            continue
        risk_score = min(
            100.0,
            item.utilization_pct * 0.55 + item.overload_count * 5 + weather_count * 2.5,
        )
        causes = []
        if item.utilization_pct >= 100:
            causes.append("Sector demand exceeds published capacity.")
        elif item.utilization_pct >= 85:
            causes.append("Sector demand is approaching capacity.")
        if weather_count:
            causes.append(f"{weather_count} active flights intersect severe weather.")
        if not causes:
            causes.append("Sector utilization is elevated.")

        affected = len(set(item.contributing_flight_ids) | conflict_ids_by_sector[item.sector_id])
        risks.append(
            RiskSummary(
                id=f"{item.sector_id}:{time_label}",
                sector_id=item.sector_id,
                altitude_band=item.altitude_band,
                peak_time=time_label,
                risk_score=round(risk_score, 1),
                utilization_pct=item.utilization_pct,
                affected_flight_count=affected,
                projected_delay_minutes=projected_delay_minutes(item.overload_count, weather_count),
                causes=causes,
            )
        )

    risks.sort(key=lambda risk: risk.risk_score, reverse=True)
    return risks[:max_items]
