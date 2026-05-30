from __future__ import annotations

from app.core.schemas import (
    ActionDecisionResponse,
    ActionPreviewResponse,
    PreviewMetrics,
    SectorDelta,
)

from .scenario_service import ScenarioService


class ActionPreviewService:
    def __init__(self, scenarios: ScenarioService | None = None):
        self.scenarios = scenarios or ScenarioService()

    def preview(self, scenario_id: str, time_bin_id: str, recommendation_id: str) -> ActionPreviewResponse:
        state = self.scenarios.scenario_state(scenario_id, time_bin_id, include_flights=False)
        max_util = max((item.utilization_pct for item in state.sector_occupancy), default=0.0)
        overloaded = sum(1 for item in state.sector_occupancy if item.utilization_pct >= 100)
        affected = state.risks[0].affected_flight_count if state.risks else 0
        delay = state.risks[0].projected_delay_minutes if state.risks else 0

        if recommendation_id.startswith("reroute"):
            util_factor = 0.88
            delay_factor = 0.72
        elif recommendation_id.startswith("meter"):
            util_factor = 0.92
            delay_factor = 0.66
        elif recommendation_id.startswith("altitude-cap"):
            util_factor = 0.94
            delay_factor = 0.82
        else:
            util_factor = 1.0
            delay_factor = 1.0

        top_sectors = state.sector_occupancy[:4]
        deltas = [
            SectorDelta(
                sector_id=item.sector_id,
                before_utilization_pct=item.utilization_pct,
                after_utilization_pct=round(item.utilization_pct * util_factor, 1),
                delta_pct=round(item.utilization_pct * util_factor - item.utilization_pct, 1),
            )
            for item in top_sectors
        ]

        before = PreviewMetrics(
            max_utilization_pct=round(max_util, 1),
            overloaded_sector_count=overloaded,
            affected_flight_count=affected,
            projected_delay_minutes=delay,
        )
        after_max = round(max_util * util_factor, 1)
        after = PreviewMetrics(
            max_utilization_pct=after_max,
            overloaded_sector_count=max(0, overloaded - (1 if util_factor < 0.95 and overloaded else 0)),
            affected_flight_count=affected,
            projected_delay_minutes=int(delay * delay_factor),
        )
        return ActionPreviewResponse(
            recommendation_id=recommendation_id,
            before=before,
            after=after,
            changed_sectors=deltas,
            narrative=(
                "Preview uses a deterministic simulation heuristic over the bundled data. "
                "It is suitable for demo comprehension, not operational execution."
            ),
        )

    def decide(
        self,
        scenario_id: str,
        time_bin_id: str,
        recommendation_id: str,
        decision: str,
        operator_note: str | None = None,
    ) -> ActionDecisionResponse:
        # Touch state so invalid scenario/time choices fail instead of recording nonsense.
        self.scenarios.scenario_state(scenario_id, time_bin_id, include_flights=False)
        if decision == "accept":
            return ActionDecisionResponse(
                recommendation_id=recommendation_id,
                decision="accept",
                status="recorded",
                message="Operator accepted the simulated recommendation.",
                next_step="Show the previewed forecast delta and keep monitoring downstream sectors.",
            )
        if decision == "modify":
            return ActionDecisionResponse(
                recommendation_id=recommendation_id,
                decision="modify",
                status="needs_modification",
                message="Operator requested a modification.",
                next_step=operator_note or "Open the meeting room and ask Jarvis which constraint should change.",
            )
        return ActionDecisionResponse(
            recommendation_id=recommendation_id,
            decision="reject",
            status="rejected",
            message="Operator rejected the simulated recommendation.",
            next_step="Keep the card in the audit trail and continue monitoring the active risk window.",
        )
