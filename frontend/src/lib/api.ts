// Thin API layer. MOCK=true serves local JSON so the app runs with no backend (M1).
// Flip MOCK to false (or set VITE_USE_BACKEND=1) to hit the real FastAPI at /api.

import type {
  ScenarioListResponse,
  ScenarioSummaryResponse,
  ScenarioStateResponse,
  BriefingResponse,
  ActionPreviewRequest,
  ActionPreviewResponse,
  RoundtableRequest,
  RoundtableResponse,
} from "./types";

import scenariosMock from "../data/mock/scenarios.json";
import summaryMock from "../data/mock/scenario-summary.json";
import stateMock from "../data/mock/scenario-state.json";
import briefingMock from "../data/mock/briefing.json";
import previewMock from "../data/mock/action-preview.json";
import roundtableMock from "../data/mock/roundtable.json";

export const MOCK = import.meta.env.VITE_USE_BACKEND !== "1";

// Simulate network latency so loading/skeleton states are visible in the demo.
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function get<T>(path: string, mock: T, ms = 350): Promise<T> {
  if (MOCK) {
    await delay(ms);
    return mock;
  }
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
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
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
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

  roundtable: (req: RoundtableRequest) =>
    post<RoundtableResponse>(
      "/agents/roundtable",
      req,
      roundtableMock as RoundtableResponse
    ),
};
