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
  | "Historian"
  | "Auditor";

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
  kind: "points" | "png";
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
  primary_risk: RiskSummary;
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

/* ---- Agent Meeting Room (NEW) ---- */
export type RoundtableRequest = {
  scenario_id: string;
  time_bin_id: string;
  question: string;
};

export type RoundtableAgentResponse = {
  agent: Exclude<AgentName, "Jarvis">;
  response: string;
  evidence: string[];
  severity: Severity;
};

export type RoundtableResponse = {
  question: string;
  agent_responses: RoundtableAgentResponse[];
  synthesis: {
    agent: "Jarvis";
    answer: string;
    recommendation_id: string | null;
  };
  generated_at: string;
};
