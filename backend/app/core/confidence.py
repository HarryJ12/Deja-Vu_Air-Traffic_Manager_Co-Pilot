from __future__ import annotations

from .schemas import ConfidenceBlock, DivergenceAlarm, RiskSummary, WeatherConflict


def confidence_block(risk: RiskSummary | None, conflicts: list[WeatherConflict]) -> ConfidenceBlock:
    if risk is None:
        return ConfidenceBlock(
            overall_pct=74,
            support=["No capacity breach or severe route-weather conflict dominates the selected bin."],
            weaknesses=["Forecast can change as later bins are selected."],
            divergence_alarm=None,
        )

    confidence = int(max(52, min(91, 86 - len(conflicts) * 0.4 + min(risk.utilization_pct, 120) * 0.04)))
    divergence = None
    if len(conflicts) >= 8:
        divergence = DivergenceAlarm(
            is_active=True,
            reason="Weather-conflicted flight count is high enough that historical precedent is less reliable.",
            confidence_delta_pct=-9,
        )
        confidence = max(45, confidence - 9)

    return ConfidenceBlock(
        overall_pct=confidence,
        support=[
            "Sector demand is computed directly from planned routes and sector polygons.",
            "Weather conflicts use the provided 40 dBZ and echo-top altitude rule.",
        ],
        weaknesses=[
            "Historical evidence is mocked from bundled scenarios.",
            "No aircraft type, runway configuration, winds, or active TMI state is available.",
        ],
        divergence_alarm=divergence,
    )
