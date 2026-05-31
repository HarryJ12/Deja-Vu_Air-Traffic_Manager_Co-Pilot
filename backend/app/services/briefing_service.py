from __future__ import annotations

from datetime import datetime, timezone

from app.config import get_settings
from app.core.confidence import confidence_block
from app.core.historian import mocked_historical_findings
from app.core.recommendations import recommendations_for_risk
from app.core.schemas import AgentFinding, BriefingResponse

from .ai_service import ClaudeBriefingService
from .scenario_service import ScenarioService


class BriefingService:
    def __init__(self, scenarios: ScenarioService | None = None):
        self.scenarios = scenarios or ScenarioService()
        self.settings = get_settings()
        self.claude = ClaudeBriefingService()

    def briefing(
        self,
        scenario_id: str,
        time_bin_id: str,
        mode: str = "quick",
        ai_summary: bool = True,
    ) -> BriefingResponse:
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
        if ai_summary:
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
                "No major traffic or storm problem is predicted in this time slice.",
                (
                    "Jarvis synthesizes Air Marshal capacity, Weather Boy storm impact, Domino delay pressure, "
                    "Historian precedent, and Risko confidence checks. Current signals stay below the action threshold."
                ),
            )
        return (
            f"Airspace region {primary.sector_id} is predicted to get crowded, reaching {primary.utilization_pct}% of its normal limit near {primary.peak_time}.",
            (
                "Jarvis is synthesizing a predicted operational risk from all specialist reads: "
                f"Air Marshal sees {primary.affected_flight_count} affected flights, "
                f"Weather Boy sees {conflict_count} severe weather intersections, "
                f"Domino estimates {primary.projected_delay_minutes} minutes of downstream delay, "
                "Historian provides bundled-scenario analogs, and Risko checks confidence drift. "
                "Recommendations remain operator-approved and simulation-only."
            ),
        )

    def _agent_findings(self, scenario_id: str, primary, state) -> list[AgentFinding]:
        conflict_count = len(state.weather_conflicts)
        alert_conflicts = [item for item in state.weather_conflicts if item.severity == "alert"]
        max_refc = max((item.refc_dbz for item in state.weather_conflicts), default=0)
        max_retop = max((item.retop_ft for item in state.weather_conflicts), default=0)
        primary_sector = None
        if primary:
            primary_sector = next(
                (item for item in state.sector_occupancy if item.sector_id == primary.sector_id),
                None,
            )

        weather_severity = "alert" if conflict_count >= 8 else "watch" if conflict_count else "info"
        air_severity = "alert" if primary and primary.utilization_pct >= 100 else "watch" if primary else "info"
        domino_severity = "watch" if primary and primary.projected_delay_minutes >= 45 else "info"
        risko_severity = "alert" if conflict_count >= 8 else "watch" if primary else "info"

        findings = [
            AgentFinding(
                agent="Weather Boy",
                severity=weather_severity,
                title=f"{conflict_count} flights intersect storm risk",
                detail=(
                    f"{len(alert_conflicts)} flight paths cross storms strong enough to matter. "
                    "A flight is flagged only when the storm is both intense and tall enough to reach cruising aircraft."
                ),
                evidence=[
                    f"Strongest storm intensity is {round(max_refc, 1)} dBZ; tallest storm top is {round(max_retop):,} ft.",
                    "Uses the provided HRRR-derived storm intensity and storm-height grids.",
                ],
            ),
            AgentFinding(
                agent="Air Marshal",
                severity=air_severity,
                title=(
                    f"{primary.sector_id} is getting crowded"
                    if primary
                    else "Airspace crowding check complete"
                ),
                detail=(
                    (
                        f"{primary_sector.count} planes are assigned to a region sized for {primary_sector.capacity}; "
                        f"that is {primary_sector.overload_count} over the planned limit."
                    )
                    if primary and primary_sector
                    else f"Top risk is airspace region {primary.sector_id} at {primary.utilization_pct}% of its normal limit."
                    if primary
                    else "No airspace region exceeds the watch threshold in this bin."
                ),
                evidence=[
                    (
                        f"{len(primary_sector.contributing_flight_ids)} flights drive the crowding count."
                        if primary_sector
                        else "No overload contributors in the selected bin."
                    ),
                    "Uses planned flight positions plus airspace-region polygons from the bundle.",
                ],
            ),
            AgentFinding(
                agent="Domino",
                severity=domino_severity,
                title="Network impact chain",
                detail=(
                    (
                        f"{primary.affected_flight_count} affected flights create a "
                        f"{primary.projected_delay_minutes}-minute network delay estimate if the peak is left alone."
                    )
                    if primary
                    else "No downstream delay estimate is elevated."
                ),
                evidence=[
                    (
                        f"Primary pressure is {primary.utilization_pct}% in the {primary.altitude_band} altitude layer."
                        if primary
                        else "Network pressure remains below the intervention threshold."
                    ),
                    "Delay is an explainable hackathon estimate, not a certified FAA prediction.",
                ],
            ),
            AgentFinding(
                agent="Risko",
                severity=risko_severity,
                title="Confidence and caveats",
                detail=(
                    (
                        f"{conflict_count} weather intersections make the forecast more sensitive. "
                        "Risko treats the recommendation as a candidate plan, not a guaranteed answer."
                    )
                    if conflict_count
                    else "Risko sees no major reason the forecast should diverge in this bin, but later forecast slices can still shift the call."
                ),
                evidence=[
                    (
                        f"Primary risk score is {round(primary.risk_score, 1)} for airspace region {primary.sector_id}."
                        if primary
                        else "No primary risk is above the watch threshold."
                    ),
                    "Confidence blends crowding, storm conflicts, and mocked historical precedent.",
                ],
            ),
            mocked_historical_findings(
                self.scenarios.bundle.scenario_ids(),
                scenario_id,
                primary,
                conflict_count,
            ),
        ]
        return findings
