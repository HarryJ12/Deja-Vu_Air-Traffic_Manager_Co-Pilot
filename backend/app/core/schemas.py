from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


AltitudeBand = Literal["LOW", "HIGH"]
Severity = Literal["info", "watch", "alert"]
AgentName = Literal["Jarvis", "Weather Boy", "Air Marshal", "Domino", "Historian", "Auditor"]


class Scenario(BaseModel):
    id: str
    asked_at: str
    flight_count: int
    time_bin_count: int
    window_start: str
    window_end: str


class ScenarioListResponse(BaseModel):
    scenarios: list[Scenario]


class TimeBin(BaseModel):
    id: str
    valid_from: str
    valid_to: str
    label: str
    based_at: str


class FlightPosition(BaseModel):
    flight_id: str
    flight_number: str
    lat: float
    lon: float
    altitude_ft: int
    speed_kt: int
    origin: str
    destination: str
    progress_pct: float


class SectorOccupancy(BaseModel):
    sector_id: str
    altitude_band: AltitudeBand
    count: int
    capacity: int
    utilization_pct: float
    overload_count: int
    contributing_flight_ids: list[str] = Field(default_factory=list)


class WeatherConflict(BaseModel):
    flight_id: str
    sector_id: str | None
    lat: float
    lon: float
    refc_dbz: float
    retop_ft: float
    altitude_ft: int
    severity: Literal["watch", "alert"]


class WeatherOverlayRef(BaseModel):
    kind: Literal["refc", "retop"]
    valid_from: str
    valid_to: str
    max_value: float | None
    conflict_count: int


class RiskSummary(BaseModel):
    id: str
    sector_id: str
    altitude_band: AltitudeBand
    peak_time: str
    risk_score: float
    utilization_pct: float
    affected_flight_count: int
    projected_delay_minutes: int
    causes: list[str] = Field(default_factory=list)


class AgentFinding(BaseModel):
    agent: AgentName
    severity: Severity
    title: str
    detail: str
    evidence: list[str] = Field(default_factory=list)


class DivergenceAlarm(BaseModel):
    is_active: bool
    reason: str
    confidence_delta_pct: int


class ConfidenceBlock(BaseModel):
    overall_pct: int
    support: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    divergence_alarm: DivergenceAlarm | None = None


class RecommendationCard(BaseModel):
    id: str
    title: str
    action_type: Literal["reroute", "meter", "altitude_cap", "ground_delay", "monitor"]
    summary: str
    expected_impact: str
    confidence_pct: int
    affected_flight_ids: list[str] = Field(default_factory=list)
    agent_contributors: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)


class ScenarioSummaryResponse(BaseModel):
    scenario: Scenario
    sectors: dict[str, Any]
    time_bins: list[TimeBin]
    initial_time_bin_id: str
    top_risks: list[RiskSummary]


class ScenarioStateResponse(BaseModel):
    time_bin: TimeBin
    flights: list[FlightPosition]
    sector_occupancy: list[SectorOccupancy]
    weather_conflicts: list[WeatherConflict]
    weather_tiles: list[WeatherOverlayRef]
    risks: list[RiskSummary]


class BriefingResponse(BaseModel):
    mode: Literal["quick", "detailed", "full"]
    headline: str
    summary: str
    primary_risk: RiskSummary | None
    agents: list[AgentFinding]
    recommendations: list[RecommendationCard]
    confidence: ConfidenceBlock
    generated_at: str


class ActionPreviewRequest(BaseModel):
    scenario_id: str
    time_bin_id: str
    recommendation_id: str


class PreviewMetrics(BaseModel):
    max_utilization_pct: float
    overloaded_sector_count: int
    affected_flight_count: int
    projected_delay_minutes: int


class SectorDelta(BaseModel):
    sector_id: str
    before_utilization_pct: float
    after_utilization_pct: float
    delta_pct: float


class ActionPreviewResponse(BaseModel):
    recommendation_id: str
    before: PreviewMetrics
    after: PreviewMetrics
    changed_sectors: list[SectorDelta]
    narrative: str


class VoiceSynthesisRequest(BaseModel):
    text: str
    voice_id: str | None = None
    agent: AgentName = "Jarvis"
    meeting_room: bool = False


class VoiceSynthesisResponse(BaseModel):
    mode: Literal["mock", "live"]
    content_type: str
    audio_base64: str | None = None
    message: str


class VoiceTranscriptionResponse(BaseModel):
    mode: Literal["mock", "live"]
    provider: Literal["openai"]
    model: str
    text: str
    message: str


class ChatRequest(BaseModel):
    scenario_id: str
    time_bin_id: str
    message: str


class MeetingRoomChatRequest(ChatRequest):
    requested_agents: list[AgentName] | None = None


class ChatMessage(BaseModel):
    role: Literal["operator", "agent"]
    agent: AgentName | None = None
    content: str
    severity: Severity = "info"
    voice_id: str | None = None
    source: str | None = None


class ChatResponse(BaseModel):
    room: Literal["jarvis", "meeting_room"]
    messages: list[ChatMessage]
    briefing: BriefingResponse
    note: str
