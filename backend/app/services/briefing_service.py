from __future__ import annotations

from datetime import datetime, timezone

from app.config import get_settings
from app.core.historian import mocked_historical_findings
from app.core.recommendations import recommendations_for_risk
from app.core.risko import confidence_block, risko_findings
from app.core.schemas import AgentFinding, BriefingResponse

from .ai_service import ClaudeBriefingService
from .scenario_service import ScenarioService


class BriefingService:
    def __init__(self, scenarios: ScenarioService | None = None):
        self.scenarios = scenarios or ScenarioService()
        self.settings = get_settings()
        self.claude = ClaudeBriefingService()

    def briefing(self, scenario_id: str, time_bin_id: str, mode: str = "quick") -> BriefingResponse:
        state = self.scenarios.scenario_state(scenario_id, time_bin_id, include_flights=False)
        primary = state.risks[0] if state.risks else None
        affected_ids = []
        if primary:
            for item in state.sector_occupancy:
                if item.sector_id == primary.sector_id:
                    affected_ids = item.contributing_flight_ids
                    break

        agents = self._agent_findings(scenario_id, primary, state)
        confidence = confidence_block(primary, state.weather_conflicts)
        recs = recommendations_for_risk(primary, affected_ids)
        headline, summary = self._headline_and_summary(primary, len(state.weather_conflicts))
        summary = self.claude.render_summary(headline, summary, primary, agents, recs)

        return BriefingResponse(
            mode=mode if mode in {"quick", "detailed", "full"} else "quick",  # type: ignore[arg-type]
            headline=headline,
            summary=summary,
            primary_risk=primary,
            agents=agents,
            recommendations=recs,
            confidence=confidence,
            generated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        )

    def _headline_and_summary(self, primary, conflict_count: int) -> tuple[str, str]:
        if primary is None:
            return (
                "No alert-level sector risk in the selected bin.",
                "Jarvis recommends continued monitoring. Capacity and severe weather conflicts remain below the action threshold.",
            )
        return (
            f"{primary.sector_id} peaks at {primary.utilization_pct}% capacity near {primary.peak_time}.",
            (
                f"{primary.affected_flight_count} flights drive the selected risk. "
                f"{conflict_count} severe weather intersections are active in this time bin. "
                "Recommendations remain operator-approved and simulation-only."
            ),
        )

    def _agent_findings(self, scenario_id: str, primary, state) -> list[AgentFinding]:
        weather_severity = "alert" if len(state.weather_conflicts) >= 8 else "watch" if state.weather_conflicts else "info"
        air_severity = "alert" if primary and primary.utilization_pct >= 100 else "watch" if primary else "info"

        findings = [
            AgentFinding(
                agent="Weather Boy",
                severity=weather_severity,
                title=f"{len(state.weather_conflicts)} weather-route conflicts",
                detail="Flights are flagged only when reflectivity is at least 40 dBZ and echo tops reach cruise altitude.",
                evidence=["Uses HRRR-derived refc and retop matrices from the bundle."],
            ),
            AgentFinding(
                agent="Air Marshal",
                severity=air_severity,
                title="Sector capacity forecast complete",
                detail=(
                    f"Top risk is {primary.sector_id} at {primary.utilization_pct}% utilization."
                    if primary
                    else "No sector exceeds the watch threshold in this bin."
                ),
                evidence=["Uses flight interpolation plus point-in-polygon sector assignment."],
            ),
            AgentFinding(
                agent="Domino",
                severity="watch" if primary else "info",
                title="Downstream impact estimate",
                detail=(
                    f"Projected delay proxy is {primary.projected_delay_minutes} minutes for the selected risk."
                    if primary
                    else "No downstream delay proxy is elevated."
                ),
                evidence=["Delay is an explainable heuristic, not an FAA-certified prediction."],
            ),
            mocked_historical_findings(self.scenarios.bundle.scenario_ids(), scenario_id, primary),
            risko_findings(primary, state.weather_conflicts),
        ]
        return findings
