from __future__ import annotations

from .schemas import AgentFinding, ConfidenceBlock, DivergenceAlarm, RiskSummary, WeatherConflict


def audit_findings(risk: RiskSummary | None, conflicts: list[WeatherConflict]) -> AgentFinding:
    if risk is None:
        return AgentFinding(
            agent="Auditor",
            severity="info",
            title="No alert-level weakness",
            detail="The current snapshot does not require a recommendation beyond monitoring.",
            evidence=["Continue to re-check as the Time Warp slider advances."],
        )

    weaknesses = [
        "Flight dynamics are simplified to constant cruise altitude and speed.",
        "Historical outcomes are mocked because real interventions are not in the dataset.",
    ]
    if conflicts:
        weaknesses.append("Weather impact uses reflectivity and echo tops only; winds and turbulence are absent.")
    return AgentFinding(
        agent="Auditor",
        severity="watch" if risk.risk_score < 90 else "alert",
        title="Recommendation is plausible but bounded",
        detail="The recommendation is explainable from bundle data, but should be treated as decision support.",
        evidence=weaknesses,
    )


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
