// API types — single frontend source of truth.
// Mirrors backend/app/core/schemas.py per scaffolding.md. Keep in sync.

export type AltitudeBand = "LOW" | "HIGH";
export type Severity = "info" | "watch" | "alert";
export type BriefingMode = "quick" | "detailed" | "full";

export type AgentName =
  | "Jarvis"
  | "Weather Boy"
  | "Air Marshal"
  | "Domino"
  | "Risko"
  | "Historian";

export type ActionType =
  | "reroute"
  | "meter"
  | "altitude_cap"
  | "ground_delay"
  | "monitor";

/* ---- Scenarios ---- */
export type Scenario = {
  id: string;
  asked_at: string;
  flight_count: number;
  time_bin_count: number;
  window_start: string;
  window_end: string;
};

export type ScenarioListResponse = { scenarios: Scenario[] };

export type TimeBin = {
  id: string;
  valid_from: string;
  valid_to: string;
  label: string;
  based_at?: string;
};

/* ---- Geo / sectors ---- */
export type SectorProperties = {
  name: string;
  altitude_from_ft: number;
  altitude_to_ft: number;
  capacity: number;
};

export type SectorFeature = {
  type: "Feature";
  geometry: { type: "Polygon"; coordinates: number[][][] };
  properties: SectorProperties;
};

export type SectorFeatureCollection = {
  type: "FeatureCollection";
  features: SectorFeature[];
};

/* ---- Tactical state ---- */
export type FlightPosition = {
  flight_id: string;
  flight_number: string;
  lat: number;
  lon: number;
  altitude_ft: number;
  speed_kt: number;
  origin: string;
  destination: string;
  progress_pct?: number;
};

export type SectorOccupancy = {
  sector_id: string;
  altitude_band: AltitudeBand;
  count: number;
  capacity: number;
  utilization_pct: number;
  overload_count: number;
  contributing_flight_ids: string[];
  // Optional polygon (screen-projectable) for mock-first rendering.
  polygon?: number[][];
};

export type WeatherConflict = {
  flight_id: string;
  sector_id: string | null;
  lat: number;
  lon: number;
  refc_dbz: number;
  retop_ft: number;
  altitude_ft: number;
  severity: "watch" | "alert";
};

export type WeatherOverlayRef = {
  kind: "points" | "png" | "refc" | "retop";
  valid_from?: string;
  valid_to?: string;
  max_value?: number | null;
  conflict_count?: number;
  url?: string;
  points?: { lat: number; lon: number; refc_dbz: number; retop_ft: number }[];
};

export type RiskSummary = {
  id: string;
  sector_id: string;
  altitude_band: AltitudeBand;
  peak_time: string;
  risk_score: number;
  utilization_pct: number;
  affected_flight_count: number;
  projected_delay_minutes: number;
  causes: string[];
};

export type ScenarioStateResponse = {
  time_bin: TimeBin;
  flights: FlightPosition[];
  sector_occupancy: SectorOccupancy[];
  weather_conflicts: WeatherConflict[];
  weather_tiles: WeatherOverlayRef[];
  risks: RiskSummary[];
};

export type ScenarioSummaryResponse = {
  scenario: Scenario;
  sectors: SectorFeatureCollection;
  time_bins: TimeBin[];
  initial_time_bin_id: string;
  top_risks: RiskSummary[];
};

/* ---- Briefing ---- */
export type AgentFinding = {
  agent: AgentName;
  severity: Severity;
  title: string;
  detail: string;
  evidence: string[];
  // Optional headline metric shown right-aligned in AgentRow.
  metric?: string;
};

export type RecommendationCard = {
  id: string;
  title: string;
  action_type: ActionType;
  summary: string;
  expected_impact: string;
  confidence_pct: number;
  affected_flight_ids: string[];
  agent_contributors: string[];
  risks: string[];
};

export type DivergenceAlarm = {
  is_active: boolean;
  reason: string;
  confidence_delta_pct: number;
};

export type ConfidenceBlock = {
  overall_pct: number;
  support: string[];
  weaknesses: string[];
  divergence_alarm: DivergenceAlarm | null;
};

export type BriefingResponse = {
  mode: BriefingMode;
  headline: string;
  summary: string;
  primary_risk: RiskSummary | null;
  agents: AgentFinding[];
  recommendations: RecommendationCard[];
  confidence: ConfidenceBlock;
  generated_at: string;
};

/* ---- Action preview ---- */
export type PreviewMetrics = {
  max_utilization_pct: number;
  overloaded_sector_count: number;
  affected_flight_count: number;
  projected_delay_minutes: number;
};

export type SectorDelta = {
  sector_id: string;
  before_utilization_pct: number;
  after_utilization_pct: number;
  delta_pct: number;
};

export type ActionPreviewRequest = {
  scenario_id: string;
  time_bin_id: string;
  recommendation_id: string;
};

export type ActionPreviewResponse = {
  recommendation_id: string;
  before: PreviewMetrics;
  after: PreviewMetrics;
  changed_sectors: SectorDelta[];
  narrative: string;
};

export type ActionDecisionRequest = {
  scenario_id: string;
  time_bin_id: string;
  recommendation_id: string;
  decision: "accept" | "modify" | "reject";
  operator_note?: string;
};

export type ActionDecisionResponse = {
  recommendation_id: string;
  decision: "accept" | "modify" | "reject";
  status: "recorded" | "needs_modification" | "rejected";
  message: string;
  next_step: string;
};

export type LocationPoint = {
  lat: number;
  lon: number;
  altitude_ft: number | null;
};

export type SectorMapSummary = {
  sector_id: string;
  altitude_band: AltitudeBand;
  capacity: number;
  count: number;
  utilization_pct: number;
  overload_count: number;
};

export type WeatherSample = {
  refc_dbz: number | null;
  retop_ft: number | null;
  conflict_at_altitude: boolean | null;
  severity: "none" | "watch" | "alert" | "nodata";
};

export type NearbyFlight = {
  flight_id: string;
  flight_number: string;
  distance_nm: number;
  lat: number;
  lon: number;
  altitude_ft: number;
  origin: string;
  destination: string;
  sector_id: string | null;
  weather_conflict: boolean;
};

export type MapInspectionResponse = {
  scenario_id: string;
  time_bin: TimeBin;
  location: LocationPoint;
  sectors: SectorMapSummary[];
  weather: WeatherSample;
  nearby_flights: NearbyFlight[];
  matching_risks: RiskSummary[];
  recommended_agents: AgentName[];
  narrative: string;
};

export type FlightDetailResponse = {
  scenario_id: string;
  time_bin: TimeBin;
  flight: FlightPosition;
  sector_id: string | null;
  weather: WeatherSample;
  route: LocationPoint[];
  recommended_agents: AgentName[];
};

export type SectorDetailResponse = {
  scenario_id: string;
  time_bin: TimeBin;
  sector: SectorMapSummary;
  contributing_flights: FlightPosition[];
  weather_conflicts: WeatherConflict[];
  risks: RiskSummary[];
  recommended_agents: AgentName[];
};

export type ChatRequest = {
  scenario_id: string;
  time_bin_id: string;
  message: string;
};

export type MeetingRoomChatRequest = ChatRequest & {
  requested_agents?: AgentName[];
  history?: ChatMessage[];
};

export type ChatMessage = {
  role: "operator" | "agent";
  agent: AgentName | null;
  content: string;
  severity: Severity;
  voice_id: string | null;
  source: string | null;
};

export type ChatResponse = {
  room: "jarvis" | "meeting_room";
  messages: ChatMessage[];
  briefing: BriefingResponse;
  note: string;
};

export type AgentCard = {
  agent: AgentName;
  role: string;
  short_label: string;
  default_room: "jarvis" | "meeting_room";
  can_speak_in_default: boolean;
  meeting_room_only: boolean;
  voice_id: string | null;
  default_position: { x: number; y: number };
  responsibilities: string[];
};

export type AgentRosterResponse = {
  agents: AgentCard[];
  note: string;
};

export type VoiceTranscriptionResponse = {
  mode: "mock" | "live";
  provider: "openai";
  model: string;
  text: string;
  message: string;
};

export type VoiceSynthesisRequest = {
  text: string;
  voice_id?: string | null;
  agent?: AgentName;
  meeting_room?: boolean;
};

export type VoiceSynthesisResponse = {
  mode: "mock" | "live";
  content_type: string;
  audio_base64: string | null;
  message: string;
  agent: AgentName;
  voice_id: string;
  is_playable: boolean;
  audio_bytes: number;
  error_code: string | null;
};
