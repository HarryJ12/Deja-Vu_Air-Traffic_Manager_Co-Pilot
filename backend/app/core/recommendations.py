from __future__ import annotations

from .schemas import RecommendationCard, RiskSummary


def recommendations_for_risk(risk: RiskSummary | None, flight_ids: list[str]) -> list[RecommendationCard]:
    if risk is None:
        return [
            RecommendationCard(
                id="monitor-only",
                title="Continue monitoring",
                action_type="monitor",
                summary="No immediate sector or weather risk exceeds the alert threshold.",
                expected_impact="Maintains current flow while the forecast updates.",
                confidence_pct=76,
                affected_flight_ids=[],
                agent_contributors=["Jarvis", "Risko"],
                risks=["Low-risk state can change as weather evolves."],
            )
        ]

    affected = flight_ids[:20]
    cards = [
        RecommendationCard(
            id=f"meter-{risk.sector_id}",
            title=f"Meter flow into {risk.sector_id}",
            action_type="meter",
            summary="Reduce inbound demand before the projected peak instead of waiting for the sector to breach.",
            expected_impact=f"Targets roughly {max(10, risk.projected_delay_minutes // 3)} minutes of avoidable delay.",
            confidence_pct=max(55, min(90, int(92 - risk.risk_score / 4))),
            affected_flight_ids=affected,
            agent_contributors=["Air Marshal", "Domino", "Risko"],
            risks=["May shift pressure to adjacent downstream sectors."],
        ),
        RecommendationCard(
            id=f"reroute-{risk.sector_id}",
            title="Preview weather-aware reroute",
            action_type="reroute",
            summary="Move a small set of affected flights away from the congested or weather-constrained sector.",
            expected_impact="Reduces peak concentration while preserving operator approval.",
            confidence_pct=max(50, min(86, int(84 - risk.risk_score / 6))),
            affected_flight_ids=affected[:10],
            agent_contributors=["Weather Boy", "Air Marshal", "Historian", "Risko"],
            risks=["Reroute benefit is simulated with bundle data, not certified optimization."],
        ),
    ]
    if risk.altitude_band == "LOW":
        cards.append(
            RecommendationCard(
                id=f"altitude-cap-{risk.sector_id}",
                title="Evaluate altitude cap",
                action_type="altitude_cap",
                summary="Hold selected traffic out of the constrained altitude band before entering the risk window.",
                expected_impact="Reduces local complexity if neighboring sectors can absorb the traffic.",
                confidence_pct=62,
                affected_flight_ids=affected[:8],
                agent_contributors=["Air Marshal", "Risko"],
                risks=["Dataset has cruise altitude only, so climb/descent effects are approximated."],
            )
        )
    return cards
