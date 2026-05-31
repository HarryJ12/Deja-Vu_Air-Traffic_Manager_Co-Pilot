from __future__ import annotations

from .schemas import AgentFinding, RiskSummary


MOCK_INTERVENTIONS = [
    "metered inbound flow before peak demand",
    "rerouted a narrow set of weather-conflicted flights",
    "held marginal departures until the sector recovered",
]


def _scenario_label(scenario_id: str) -> str:
    return scenario_id.removeprefix("asked_at_").replace("T", " ").replace("Z", "Z")


def _similar_examples(scenario_ids: list[str], risk: RiskSummary) -> list[str]:
    if not scenario_ids:
        return ["No bundled precedent windows are available for comparison."]

    offset = int(risk.risk_score) % len(scenario_ids)
    rotated = scenario_ids[offset:] + scenario_ids[:offset]
    examples = []
    for idx, scenario_id in enumerate(rotated[:3]):
        similarity = max(58, min(94, int(92 - idx * 7 - abs(100 - risk.utilization_pct) / 5)))
        intervention = MOCK_INTERVENTIONS[(idx + int(risk.risk_score)) % len(MOCK_INTERVENTIONS)]
        examples.append(f"{_scenario_label(scenario_id)}: {similarity}% similar, {intervention}.")
    return examples


def mocked_historical_findings(
    scenario_ids: list[str],
    current_scenario_id: str,
    risk: RiskSummary | None,
    weather_conflict_count: int = 0,
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
    examples = _similar_examples(others, risk)
    return AgentFinding(
        agent="Historian",
        severity="watch",
        title=f"{sample_count} precedent windows matched",
        detail=(
            f"Mock historical retrieval found a {score}% similarity pattern for {risk.sector_id} "
            f"with {weather_conflict_count} weather-route conflicts in the live bin. "
            f"The strongest precedent {intervention}."
        ),
        evidence=examples
        + [
            "Historical records are mocked from the bundled scenarios.",
            "No real Traffic Management Initiative outcomes are present in the bundle.",
            "Similarity uses sector utilization, weather conflict count, and time-to-peak features.",
        ],
    )
