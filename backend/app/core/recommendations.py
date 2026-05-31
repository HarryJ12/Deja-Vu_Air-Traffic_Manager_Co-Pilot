from __future__ import annotations

from .schemas import RecommendationCard, RiskSummary


def recommendations_for_risk(risk: RiskSummary | None, flight_ids: list[str]) -> list[RecommendationCard]:
    if risk is None:
        return [
            RecommendationCard(
                id="monitor-only",
                title="Continue monitoring",
                action_type="monitor",
                summary="No immediate airspace crowding or storm problem is above the action threshold.",
                expected_impact="Keeps the current plan in place while the forecast updates.",
                confidence_pct=76,
                affected_flight_ids=[],
                agent_contributors=["Jarvis"],
                risks=["Low-risk state can change as weather evolves."],
            )
        ]

    affected = flight_ids[:20]
    cards = [
        RecommendationCard(
            id=f"meter-{risk.sector_id}",
            title=f"Slow arrivals into {risk.sector_id}",
            action_type="meter",
            summary="Reduce how many planes enter the crowded airspace region before it reaches the projected peak.",
            expected_impact=f"Targets roughly {max(10, risk.projected_delay_minutes // 3)} minutes of avoidable delay.",
            confidence_pct=max(55, min(90, int(92 - risk.risk_score / 4))),
            affected_flight_ids=affected,
            agent_contributors=["Air Marshal", "Domino"],
            risks=["May shift pressure to adjacent downstream sectors."],
        ),
        RecommendationCard(
            id=f"reroute-{risk.sector_id}",
            title="Preview weather-aware reroute",
            action_type="reroute",
            summary="Move a small set of affected flights away from the crowded or storm-blocked airspace and compare against mocked past examples.",
            expected_impact="Reduces peak concentration while keeping the recommendation traceable.",
            confidence_pct=max(50, min(86, int(84 - risk.risk_score / 6))),
            affected_flight_ids=affected[:10],
            agent_contributors=["Weather Boy", "Air Marshal", "Historian"],
            risks=["Reroute benefit is simulated with bundle data, not certified optimization."],
        ),
    ]
    if risk.altitude_band == "LOW":
        cards.append(
            RecommendationCard(
                id=f"altitude-cap-{risk.sector_id}",
                title="Evaluate altitude cap",
                action_type="altitude_cap",
                summary="Keep selected planes out of the crowded altitude layer before they enter the risk window.",
                expected_impact="Reduces local complexity if neighboring airspace can absorb the traffic.",
                confidence_pct=62,
                affected_flight_ids=affected[:8],
                agent_contributors=["Air Marshal"],
                risks=["Dataset has cruise altitude only, so climb/descent effects are approximated."],
            )
        )
    return cards
