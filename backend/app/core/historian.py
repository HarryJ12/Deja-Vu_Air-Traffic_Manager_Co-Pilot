from __future__ import annotations

from .schemas import AgentFinding, RiskSummary


MOCK_INTERVENTIONS = [
    "metered inbound flow before peak demand",
    "rerouted a narrow set of weather-conflicted flights",
    "held marginal departures until the sector recovered",
]


def mocked_historical_findings(
    scenario_ids: list[str],
    current_scenario_id: str,
    risk: RiskSummary | None,
) -> AgentFinding:
    others = [item for item in scenario_ids if item != current_scenario_id]
    sample_count = min(8, len(others))
    if risk is None:
        return AgentFinding(
            agent="Historian",
            severity="info",
            title="No strong historical match needed",
            detail="Current demand does not exceed the risk threshold, so historical evidence is held in reserve.",
            evidence=["Historical mode is mocked from the bundled scenarios until curated outcomes exist."],
        )

    score = max(61, min(93, int(100 - abs(100 - risk.risk_score) / 2)))
    intervention = MOCK_INTERVENTIONS[int(risk.risk_score) % len(MOCK_INTERVENTIONS)]
    return AgentFinding(
        agent="Historian",
        severity="watch",
        title=f"{sample_count} similar bundled scenarios found",
        detail=(
            f"Mock historical retrieval found a {score}% similarity pattern for {risk.sector_id}. "
            f"The strongest precedent {intervention}."
        ),
        evidence=[
            "Historical records are mocked from the 11 provided scenarios.",
            "No real Traffic Management Initiative outcomes are present in the bundle.",
            "Similarity uses sector utilization, weather conflict count, and time-to-peak features.",
        ],
    )
