import { create } from "zustand";
import { api } from "../lib/api";
import type {
  Scenario,
  ScenarioSummaryResponse,
  ScenarioStateResponse,
  BriefingResponse,
  BriefingMode,
  AltitudeBand,
  ActionPreviewResponse,
  ActionDecisionResponse,
  ChatResponse,
  MapInspectionResponse,
  FlightDetailResponse,
  SectorDetailResponse,
  AgentRosterResponse,
  AgentName,
} from "../lib/types";

type Async = { loading: boolean; error: string | null };

type Layers = {
  flights: boolean;
  weather: boolean;
  towers: boolean;
  labels: boolean;
};

export type AltitudeLens = "ALL" | AltitudeBand;

export type TimeWarpControls = {
  horizonMinutes: number;
  capacityThresholdPct: number;
  altitudeLens: AltitudeLens;
  weatherDbzThreshold: number;
  interventionIntensityPct: number;
  subBinMotion: boolean;
  subBinOffsetMinutes: number;
};

export const DEFAULT_TIME_WARP_CONTROLS: TimeWarpControls = {
  horizonMinutes: 18 * 60,
  capacityThresholdPct: 90,
  altitudeLens: "ALL",
  weatherDbzThreshold: 40,
  interventionIntensityPct: 50,
  subBinMotion: false,
  subBinOffsetMinutes: 0,
};

export function altitudeMatchesLens(altitudeFt: number, lens: AltitudeLens) {
  if (lens === "ALL") return true;
  return lens === "HIGH" ? altitudeFt >= 35000 : altitudeFt < 35000;
}

export function filterRisksForControls<T extends { altitude_band: AltitudeBand; utilization_pct: number }>(
  risks: T[],
  controls: TimeWarpControls
) {
  return risks
    .filter((risk) => {
      const altitudeOk = controls.altitudeLens === "ALL" || risk.altitude_band === controls.altitudeLens;
      return altitudeOk && risk.utilization_pct >= controls.capacityThresholdPct;
    })
    .sort((a, b) => b.utilization_pct - a.utilization_pct);
}

type MeetingRoom = {
  open: boolean;
  question: string;
  loading: boolean;
  error: string | null;
  responses: ChatResponse | null;
  history: ChatResponse["messages"];
};

type AgentChat = {
  open: boolean;
  agent: AgentName | null;
  question: string;
  loading: boolean;
  error: string | null;
  responses: ChatResponse | null;
  history: ChatResponse["messages"];
};

type Toast = { id: number; message: string } | null;

let meetingRoomRequestId = 0;
let agentChatRequestId = 0;

type AppState = {
  // selection
  scenarioId: string | null;
  timeBinId: string | null;
  selectedRiskId: string | null;
  selectedSectorId: string | null;
  selectedFlightId: string | null;
  selectedTowerId: string | null;
  layers: Layers;
  timeWarpControls: TimeWarpControls;
  briefingMode: BriefingMode;
  alarmSound: boolean;

  // data
  scenarios: Scenario[];
  summary: ScenarioSummaryResponse | null;
  state: ScenarioStateResponse | null;
  nextState: ScenarioStateResponse | null;
  briefing: BriefingResponse | null;
  preview: ActionPreviewResponse | null;
  actionDecision: ActionDecisionResponse | null;
  agentRoster: AgentRosterResponse | null;
  mapInspection: MapInspectionResponse | null;
  flightDetail: FlightDetailResponse | null;
  sectorDetail: SectorDetailResponse | null;

  // async status
  scenariosStatus: Async;
  summaryStatus: Async;
  stateStatus: Async;
  briefingStatus: Async;
  previewStatus: Async;
  actionStatus: Async;
  inspectionStatus: Async;

  meetingRoom: MeetingRoom;
  agentChat: AgentChat;
  toast: Toast;

  // actions
  init: () => Promise<void>;
  selectScenario: (id: string) => Promise<void>;
  setTimeBin: (id: string) => Promise<void>;
  selectRisk: (id: string | null) => void;
  selectSector: (id: string | null) => void;
  selectFlight: (id: string | null) => void;
  selectTower: (id: string | null) => void;
  toggleLayer: (key: keyof Layers) => void;
  setTimeWarpControl: <K extends keyof TimeWarpControls>(
    key: K,
    value: TimeWarpControls[K]
  ) => void;
  toggleAlarmSound: () => void;
  setBriefingMode: (mode: BriefingMode) => void;
  previewAction: (recommendationId: string) => Promise<void>;
  decideAction: (
    recommendationId: string,
    decision: "accept" | "modify" | "reject",
    operatorNote?: string
  ) => Promise<void>;
  clearPreview: () => void;
  inspectMap: (lat: number, lon: number, altitudeFt?: number) => Promise<void>;
  loadFlightDetail: (flightId: string) => Promise<void>;
  loadSectorDetail: (sectorId: string) => Promise<void>;
  clearInspection: () => void;
  showToast: (message: string) => void;

  openMeetingRoom: (prefill?: string) => void;
  closeMeetingRoom: () => void;
  setMeetingQuestion: (q: string) => void;
  askMeetingRoom: (question: string, forceLive?: boolean) => Promise<ChatResponse | null>;
  setMeetingRoomResponses: (responses: ChatResponse, question?: string) => void;
  openAgentChat: (agent: AgentName, prefill?: string) => void;
  closeAgentChat: () => void;
  setAgentQuestion: (q: string) => void;
  askAgentChat: (question: string) => Promise<ChatResponse | null>;
  setAgentChatResponses: (responses: ChatResponse, question?: string) => void;
};

const idle: Async = { loading: false, error: null };

export const useStore = create<AppState>((set, get) => ({
  scenarioId: null,
  timeBinId: null,
  selectedRiskId: null,
  selectedSectorId: null,
  selectedFlightId: null,
  selectedTowerId: null,
  layers: { flights: true, weather: true, towers: true, labels: true },
  timeWarpControls: DEFAULT_TIME_WARP_CONTROLS,
  briefingMode: "quick",
  alarmSound: false,

  scenarios: [],
  summary: null,
  state: null,
  nextState: null,
  briefing: null,
  preview: null,
  actionDecision: null,
  agentRoster: null,
  mapInspection: null,
  flightDetail: null,
  sectorDetail: null,

  scenariosStatus: { ...idle },
  summaryStatus: { ...idle },
  stateStatus: { ...idle },
  briefingStatus: { ...idle },
  previewStatus: { ...idle },
  actionStatus: { ...idle },
  inspectionStatus: { ...idle },

  meetingRoom: { open: false, question: "", loading: false, error: null, responses: null, history: [] },
  agentChat: {
    open: false,
    agent: null,
    question: "",
    loading: false,
    error: null,
    responses: null,
    history: [],
  },
  toast: null,

  init: async () => {
    set({ scenariosStatus: { loading: true, error: null } });
    try {
      const { scenarios } = await api.getScenarios();
      const agentRoster = await api.getAgentRoster();
      set({ scenarios, agentRoster, scenariosStatus: { ...idle } });
      if (scenarios.length) await get().selectScenario(scenarios[0].id);
    } catch (e) {
      set({ scenariosStatus: { loading: false, error: String(e) } });
    }
  },

  selectScenario: async (id) => {
    set({
      scenarioId: id,
      selectedRiskId: null,
      selectedSectorId: null,
      selectedFlightId: null,
      mapInspection: null,
      flightDetail: null,
      sectorDetail: null,
      nextState: null,
      preview: null,
      actionDecision: null,
      summaryStatus: { loading: true, error: null },
    });
    try {
      const summary = await api.getSummary(id);
      set({ summary, timeBinId: summary.initial_time_bin_id, summaryStatus: { ...idle } });
      await get().setTimeBin(summary.initial_time_bin_id);
    } catch (e) {
      set({ summaryStatus: { loading: false, error: String(e) } });
    }
  },

  setTimeBin: async (id) => {
    const { scenarioId, summary } = get();
    if (!scenarioId) return;
    const index = summary?.time_bins.findIndex((bin) => bin.id === id) ?? -1;
    const nextBin = index >= 0 ? summary?.time_bins[index + 1] : null;
    set({
      timeBinId: id,
      nextState: null,
      stateStatus: { loading: true, error: null },
      briefingStatus: { loading: true, error: null },
    });
    try {
      const nextStatePromise = nextBin
        ? api.getState(scenarioId, nextBin.id).catch(() => null)
        : Promise.resolve(null);
      const [state, briefing, nextState] = await Promise.all([
        api.getState(scenarioId, id),
        api.getBriefing(scenarioId, id),
        nextStatePromise,
      ]);
      set({
        state,
        nextState,
        briefing,
        mapInspection: null,
        flightDetail: null,
        sectorDetail: null,
        preview: null,
        actionDecision: null,
        stateStatus: { ...idle },
        briefingStatus: { ...idle },
      });
    } catch (e) {
      set({
        stateStatus: { loading: false, error: String(e) },
        briefingStatus: { loading: false, error: String(e) },
      });
    }
  },

  selectRisk: (id) =>
    set((s) => ({
      selectedRiskId: id,
      selectedSectorId:
        id && s.state
          ? s.state.risks.find((r) => r.id === id)?.sector_id ?? s.selectedSectorId
          : s.selectedSectorId,
    })),
  selectSector: (id) => set({ selectedSectorId: id }),
  selectFlight: (id) => set({ selectedFlightId: id, selectedTowerId: null }),
  selectTower: (id) => set({ selectedTowerId: id, selectedFlightId: null }),

  toggleLayer: (key) =>
    set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),
  setTimeWarpControl: (key, value) =>
    set((s) => ({
      timeWarpControls: {
        ...s.timeWarpControls,
        [key]: value,
      },
    })),
  toggleAlarmSound: () => set((s) => ({ alarmSound: !s.alarmSound })),

  setBriefingMode: (mode) => set({ briefingMode: mode }),

  previewAction: async (recommendationId) => {
    const { scenarioId, timeBinId } = get();
    if (!scenarioId || !timeBinId) return;
    set({ previewStatus: { loading: true, error: null } });
    try {
      const preview = await api.previewAction({
        scenario_id: scenarioId,
        time_bin_id: timeBinId,
        recommendation_id: recommendationId,
      });
      set({ preview, previewStatus: { ...idle } });
    } catch (e) {
      set({ previewStatus: { loading: false, error: String(e) } });
    }
  },
  clearPreview: () => set({ preview: null }),

  decideAction: async (recommendationId, decision, operatorNote) => {
    const { scenarioId, timeBinId } = get();
    if (!scenarioId || !timeBinId) return;
    set({ actionStatus: { loading: true, error: null } });
    try {
      const actionDecision = await api.decideAction({
        scenario_id: scenarioId,
        time_bin_id: timeBinId,
        recommendation_id: recommendationId,
        decision,
        operator_note: operatorNote,
      });
      set({ actionDecision, actionStatus: { ...idle } });
      get().showToast(actionDecision.message);
      if (decision === "modify") get().openMeetingRoom(actionDecision.next_step);
    } catch (e) {
      set({ actionStatus: { loading: false, error: String(e) } });
    }
  },

  inspectMap: async (lat, lon, altitudeFt) => {
    const { scenarioId, timeBinId } = get();
    if (!scenarioId || !timeBinId) return;
    set({ inspectionStatus: { loading: true, error: null } });
    try {
      const mapInspection = await api.inspectMap(scenarioId, timeBinId, lat, lon, altitudeFt);
      set({ mapInspection, flightDetail: null, sectorDetail: null, inspectionStatus: { ...idle } });
    } catch (e) {
      set({ inspectionStatus: { loading: false, error: String(e) } });
    }
  },

  loadFlightDetail: async (flightId) => {
    const { scenarioId, timeBinId } = get();
    if (!scenarioId || !timeBinId) return;
    set({ inspectionStatus: { loading: true, error: null } });
    try {
      const flightDetail = await api.getFlightDetail(scenarioId, timeBinId, flightId);
      set({ flightDetail, mapInspection: null, sectorDetail: null, inspectionStatus: { ...idle } });
    } catch (e) {
      set({ inspectionStatus: { loading: false, error: String(e) } });
    }
  },

  loadSectorDetail: async (sectorId) => {
    const { scenarioId, timeBinId } = get();
    if (!scenarioId || !timeBinId) return;
    set({ inspectionStatus: { loading: true, error: null } });
    try {
      const sectorDetail = await api.getSectorDetail(scenarioId, timeBinId, sectorId);
      set({ sectorDetail, mapInspection: null, flightDetail: null, inspectionStatus: { ...idle } });
    } catch (e) {
      set({ inspectionStatus: { loading: false, error: String(e) } });
    }
  },

  clearInspection: () => set({ mapInspection: null, flightDetail: null, sectorDetail: null }),

  showToast: (message) => {
    const id = Date.now();
    set({ toast: { id, message } });
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, 2600);
  },

  openMeetingRoom: (prefill) =>
    set((s) => ({
      meetingRoom: { ...s.meetingRoom, open: true, question: prefill ?? s.meetingRoom.question },
    })),
  closeMeetingRoom: () =>
    set((s) => {
      meetingRoomRequestId += 1;
      return { meetingRoom: { ...s.meetingRoom, open: false, loading: false } };
    }),
  setMeetingQuestion: (q) =>
    set((s) => ({ meetingRoom: { ...s.meetingRoom, question: q } })),

  askMeetingRoom: async (question, forceLive = false) => {
    const { scenarioId, timeBinId } = get();
    if (!scenarioId || !timeBinId || !question.trim()) return null;
    const requestId = ++meetingRoomRequestId;
    set((s) => ({
      meetingRoom: { ...s.meetingRoom, loading: true, error: null, responses: null, question },
    }));
    try {
      const responses = await api.meetingRoomChat(
        {
          scenario_id: scenarioId,
          time_bin_id: timeBinId,
          message: question,
          history: get().meetingRoom.history.slice(-12),
        },
        forceLive
      );
      if (requestId !== meetingRoomRequestId || !get().meetingRoom.open) return null;
      set((s) => ({
        meetingRoom: {
          ...s.meetingRoom,
          loading: false,
          responses,
          history: [...s.meetingRoom.history, ...responses.messages],
        },
      }));
      return responses;
    } catch (e) {
      if (requestId === meetingRoomRequestId) {
        set((s) => ({ meetingRoom: { ...s.meetingRoom, loading: false, error: String(e) } }));
      }
      return null;
    }
  },

  setMeetingRoomResponses: (responses, question) =>
    set((s) => ({
      meetingRoom: {
        ...s.meetingRoom,
        open: true,
        loading: false,
        error: null,
        question: question ?? s.meetingRoom.question,
        responses,
        history: [...s.meetingRoom.history, ...responses.messages],
      },
    })),

  openAgentChat: (agent, prefill) =>
    set((s) => ({
      agentChat: {
        ...s.agentChat,
        open: true,
        agent,
        question: prefill ?? (s.agentChat.agent === agent ? s.agentChat.question : ""),
        responses: s.agentChat.agent === agent ? s.agentChat.responses : null,
        history: s.agentChat.agent === agent ? s.agentChat.history : [],
        error: null,
      },
    })),
  closeAgentChat: () =>
    set((s) => {
      agentChatRequestId += 1;
      return {
        agentChat: { ...s.agentChat, open: false, agent: null, loading: false },
      };
    }),
  setAgentQuestion: (q) =>
    set((s) => ({ agentChat: { ...s.agentChat, question: q } })),
  askAgentChat: async (question) => {
    const { scenarioId, timeBinId, agentChat } = get();
    if (!scenarioId || !timeBinId || !agentChat.agent || !question.trim()) return null;
    const requestId = ++agentChatRequestId;
    set((s) => ({
      agentChat: { ...s.agentChat, loading: true, error: null, responses: null, question },
    }));
    try {
      const responses = await api.meetingRoomChat(
        {
          scenario_id: scenarioId,
          time_bin_id: timeBinId,
          message: question,
          requested_agents: [agentChat.agent],
          history: agentChat.history.slice(-8),
        },
        true
      );
      if (
        requestId !== agentChatRequestId ||
        !get().agentChat.open ||
        get().agentChat.agent !== agentChat.agent
      ) {
        return null;
      }
      set((s) => ({
        agentChat: {
          ...s.agentChat,
          loading: false,
          responses,
          history: [...s.agentChat.history, ...responses.messages],
        },
      }));
      return responses;
    } catch (e) {
      if (requestId === agentChatRequestId) {
        set((s) => ({ agentChat: { ...s.agentChat, loading: false, error: String(e) } }));
      }
      return null;
    }
  },
  setAgentChatResponses: (responses, question) =>
    set((s) => ({
      agentChat: {
        ...s.agentChat,
        open: true,
        loading: false,
        error: null,
        question: question ?? s.agentChat.question,
        responses,
        history: [...s.agentChat.history, ...responses.messages],
      },
    })),
}));
