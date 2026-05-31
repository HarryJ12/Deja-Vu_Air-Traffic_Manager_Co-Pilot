// Thin API layer. The console uses the real FastAPI by default so time-warp
// movement, briefings, and risk queues stay synced to the bundle. Set
// VITE_USE_MOCK=1 for mock-only frontend work.

import type {
  ScenarioListResponse,
  ScenarioSummaryResponse,
  ScenarioStateResponse,
  BriefingResponse,
  ActionPreviewRequest,
  ActionPreviewResponse,
  ActionDecisionRequest,
  ActionDecisionResponse,
  AgentRosterResponse,
  ChatRequest,
  ChatResponse,
  MeetingRoomChatRequest,
  MapInspectionResponse,
  FlightDetailResponse,
  SectorDetailResponse,
  VoiceSynthesisRequest,
  VoiceSynthesisResponse,
  VoiceTranscriptionResponse,
  AgentName,
  ChatMessage,
} from "./types";

import scenariosMock from "../data/mock/scenarios.json";
import summaryMock from "../data/mock/scenario-summary.json";
import stateMock from "../data/mock/scenario-state.json";
import briefingMock from "../data/mock/briefing.json";
import previewMock from "../data/mock/action-preview.json";
import meetingRoomMock from "../data/mock/meeting-room.json";

export const MOCK =
  import.meta.env.VITE_USE_MOCK === "1" && import.meta.env.VITE_USE_BACKEND !== "1";

// Simulate network latency so loading/skeleton states are visible in the demo.
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const ROOM_AGENT_ORDER: AgentName[] = [
  "Jarvis",
  "Air Marshal",
  "Weather Boy",
  "Domino",
  "Risko",
  "Historian",
];

async function responseError(res: Response, method: string, path: string) {
  const raw = await res.text().catch(() => "");
  let detail = raw;
  try {
    const parsed = JSON.parse(raw) as { detail?: unknown; message?: unknown };
    detail = String(parsed.detail ?? parsed.message ?? raw);
  } catch {
    detail = raw;
  }
  const suffix = detail ? `: ${detail}` : "";
  return new Error(`${method} ${path} failed: ${res.status}${suffix}`);
}

function mockMeetingRoomResponse(req: MeetingRoomChatRequest): ChatResponse {
  const base = meetingRoomMock as ChatResponse;
  const requested = req.requested_agents?.length ? req.requested_agents : ROOM_AGENT_ORDER;
  const byAgent = new Map(
    base.messages
      .filter((message): message is ChatMessage & { agent: AgentName } => message.role === "agent" && !!message.agent)
      .map((message) => [message.agent, message])
  );
  const messages: ChatMessage[] = [
    {
      role: "operator",
      agent: null,
      content: req.message,
      severity: "info",
      voice_id: null,
      source: "operator_mock",
    },
  ];

  requested.forEach((agent) => {
    const template = byAgent.get(agent);
    if (!template) return;
    messages.push({
      ...template,
      content:
        agent === "Jarvis"
          ? `Room check on "${req.message}". ${template.content}`
          : template.content,
      source: agent === "Jarvis" ? "moderator_mock" : "agent_mock",
    });
  });

  if (!req.requested_agents?.length) {
    messages.push({
      ...(byAgent.get("Jarvis") as ChatMessage),
      content: "Consensus: open the recommended action preview, then watch the adjacent-sector load before approving.",
      source: "moderator_synthesis_mock",
    });
  }

  return { ...base, messages, note: "Mock meeting room conversation." };
}

async function get<T>(path: string, mock: T, ms = 350): Promise<T> {
  if (MOCK) {
    await delay(ms);
    return mock;
  }
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw await responseError(res, "GET", path);
  return (await res.json()) as T;
}

async function post<T>(path: string, body: unknown, mock: T, ms = 600): Promise<T> {
  if (MOCK) {
    await delay(ms);
    return mock;
  }
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await responseError(res, "POST", path);
  return (await res.json()) as T;
}

async function postLiveJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await responseError(res, "POST", path);
  return (await res.json()) as T;
}

async function postLiveForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw await responseError(res, "POST", path);
  return (await res.json()) as T;
}

export const api = {
  getScenarios: () =>
    get<ScenarioListResponse>("/scenarios", scenariosMock as ScenarioListResponse),

  getSummary: (scenarioId: string) =>
    get<ScenarioSummaryResponse>(
      `/scenarios/${scenarioId}/summary`,
      summaryMock as ScenarioSummaryResponse
    ),

  getState: (scenarioId: string, timeBinId: string) =>
    get<ScenarioStateResponse>(
      `/scenarios/${scenarioId}/state?time_bin_id=${timeBinId}`,
      stateMock as ScenarioStateResponse
    ),

  getBriefing: (scenarioId: string, timeBinId: string) =>
    get<BriefingResponse>(
      `/scenarios/${scenarioId}/briefing?time_bin_id=${timeBinId}`,
      briefingMock as BriefingResponse
    ),

  previewAction: (req: ActionPreviewRequest) =>
    post<ActionPreviewResponse>(
      "/actions/preview",
      req,
      previewMock as ActionPreviewResponse
    ),

  decideAction: (req: ActionDecisionRequest) =>
    post<ActionDecisionResponse>(
      "/actions/decision",
      req,
      {
        recommendation_id: req.recommendation_id,
        decision: req.decision,
        status:
          req.decision === "modify"
            ? "needs_modification"
            : req.decision === "reject"
              ? "rejected"
              : "recorded",
        message: `Operator ${req.decision} recorded.`,
        next_step:
          req.decision === "modify"
            ? req.operator_note ?? "Open the meeting room to tune the action."
            : "Continue monitoring the active risk window.",
      } as ActionDecisionResponse
    ),

  getAgentRoster: () =>
    get<AgentRosterResponse>("/agents/roster", {
      agents: [
        {
          agent: "Jarvis",
          role: "Moderator",
          short_label: "J",
          default_room: "jarvis",
          can_speak_in_default: true,
          meeting_room_only: false,
          voice_id: "VtiJxTGG57AFTSQjMlja",
          default_position: { x: 0.72, y: 0.1 },
          responsibilities: ["prioritize risks", "summarize agents", "present recommendations"],
        },
        {
          agent: "Weather Boy",
          role: "Weather impact",
          short_label: "WX",
          default_room: "meeting_room",
          can_speak_in_default: false,
          meeting_room_only: true,
          voice_id: "FmJ4FDkdrYIKzBTruTkV",
          default_position: { x: 0.72, y: 0.24 },
          responsibilities: ["storm intensity", "echo tops", "route-weather conflicts"],
        },
        {
          agent: "Air Marshal",
          role: "Sector capacity",
          short_label: "AM",
          default_room: "meeting_room",
          can_speak_in_default: false,
          meeting_room_only: true,
          voice_id: "DcLiO3XaUWTu3gyon6hW",
          default_position: { x: 0.72, y: 0.38 },
          responsibilities: ["sector occupancy", "capacity risk", "contributing flights"],
        },
        {
          agent: "Domino",
          role: "Network impact",
          short_label: "DM",
          default_room: "meeting_room",
          can_speak_in_default: false,
          meeting_room_only: true,
          voice_id: "tnVKC6NjwhdRxoQIfKue",
          default_position: { x: 0.72, y: 0.52 },
          responsibilities: ["delay proxy", "downstream pressure", "arrival bank impact"],
        },
        {
          agent: "Risko",
          role: "Confidence guardrail",
          short_label: "RK",
          default_room: "meeting_room",
          can_speak_in_default: false,
          meeting_room_only: true,
          voice_id: "IRHApOXLvnW57QJPQH2P",
          default_position: { x: 0.72, y: 0.66 },
          responsibilities: ["confidence drift", "data caveats", "divergence warnings"],
        },
        {
          agent: "Historian",
          role: "Precedent memory",
          short_label: "H",
          default_room: "meeting_room",
          can_speak_in_default: false,
          meeting_room_only: true,
          voice_id: "Ybqj6CIlqb6M85s9Bl4n",
          default_position: { x: 0.72, y: 0.8 },
          responsibilities: ["similar scenarios", "mock outcomes", "supporting evidence"],
        },
      ],
      note: "Jarvis is the default-mode speaker. Specialist agents speak in the meeting room.",
    } as AgentRosterResponse),

  meetingRoomChat: (req: MeetingRoomChatRequest, forceLive = false) =>
    forceLive
      ? postLiveJson<ChatResponse>("/chat/meeting-room", req)
      : post<ChatResponse>(
          "/chat/meeting-room",
          req,
          mockMeetingRoomResponse(req)
        ),

  jarvisChat: (req: ChatRequest) =>
    postLiveJson<ChatResponse>("/chat/jarvis", req),

  transcribeVoice: (audio: Blob) => {
    const form = new FormData();
    const extension = audio.type.includes("mp4") ? "mp4" : "webm";
    form.append("audio", audio, `jarvis-input.${extension}`);
    return postLiveForm<VoiceTranscriptionResponse>("/voice/transcribe", form);
  },

  synthesizeVoice: (req: VoiceSynthesisRequest) =>
    postLiveJson<VoiceSynthesisResponse>("/voice/synthesize", req),

  inspectMap: (scenarioId: string, timeBinId: string, lat: number, lon: number, altitudeFt?: number) => {
    const params = new URLSearchParams({
      time_bin_id: timeBinId,
      lat: String(lat),
      lon: String(lon),
    });
    if (altitudeFt != null) params.set("altitude_ft", String(altitudeFt));
    return get<MapInspectionResponse>(
      `/scenarios/${scenarioId}/map/inspect?${params.toString()}`,
      {
        scenario_id: scenarioId,
        time_bin: { id: timeBinId, valid_from: "", valid_to: "", label: "" },
        location: { lat, lon, altitude_ft: altitudeFt ?? null },
        sectors: [],
        weather: { refc_dbz: null, retop_ft: null, conflict_at_altitude: null, severity: "nodata" },
        nearby_flights: [],
        matching_risks: [],
        recommended_agents: ["Jarvis"],
        narrative: "No backend inspection available in mock mode.",
      } as MapInspectionResponse
    );
  },

  getFlightDetail: (scenarioId: string, timeBinId: string, flightId: string) =>
    get<FlightDetailResponse>(
      `/scenarios/${scenarioId}/flights/detail?time_bin_id=${encodeURIComponent(timeBinId)}&flight_id=${encodeURIComponent(flightId)}`,
      null as unknown as FlightDetailResponse
    ),

  getSectorDetail: (scenarioId: string, timeBinId: string, sectorId: string) =>
    get<SectorDetailResponse>(
      `/scenarios/${scenarioId}/sectors/${encodeURIComponent(sectorId)}/detail?time_bin_id=${encodeURIComponent(timeBinId)}`,
      null as unknown as SectorDetailResponse
    ),
};
