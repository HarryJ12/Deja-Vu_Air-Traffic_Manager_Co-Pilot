# Frontend Build Guide — DĒJÅ VŪ Intelligence

This is the frontend build guide for the operational console. It is derived from
three sources, in this priority order:

1. `frontend/mockup.html` — **canonical visual reference**. When in doubt, match it.
2. `plan.md` — product intent, agents, thesis, demo flow.
3. `scaffolding.md` — API contract, component list, anti-vibe rules.

Read `CLAUDE.md` first; it imports the docs above.

---

## 1. Purpose & North Star

A single-screen operational console for a Traffic Flow Manager. The operator must
understand the airspace situation in **~10 seconds** and be able to act, while
remaining the decision-maker. The product surfaces *what matters*, *what happens
next*, and *why to trust or doubt* a recommendation.

The map supports the product. The map is not the product. The **Situation Brief**
and the **agents' reasoning** are the product.

---

## 2. Stack

- **Vite + React 18 + TypeScript**
- **Zustand** for app state (scenario / time bin / selection / layers / meeting room)
- **Custom Canvas/SVG** tactical map — no map tiles. Project lat/lon → screen.
- **Recharts or lightweight inline SVG** for the sector utilization curve/sparkline
- **Plain CSS + design tokens** (no Tailwind) for tight control of the anti-vibe system
- Fetch via a thin `lib/api.ts`; **mock-first** (local JSON) then swap base URL to the backend

No state library beyond Zustand. No component framework (MUI/Chakra) — they fight
the brand. Keep dependencies minimal.

---

## 3. Design System (canonical = `mockup.html`)

Use these tokens. They come from `mockup.html` and **supersede** the values in
`scaffolding.md`'s `tokens.css` (the mockup is the latest direction). Note the
difference: red is `#D32F2F` (not `#e10600`), bg is `#000000` (not `#050505`).

```css
:root {
  --bg-base: #000000;
  --bg-panel: #141414;
  --bg-panel-hover: #1c1c1c;
  --border-subtle: #2a2a2a;
  --border-strong: #404040;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --accent-red: #D32F2F;
  --accent-red-hover: #B71C1C;

  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;

  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;

  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

Type scale: base **13px**, `h1` 16px uppercase tracked, `h2` 14px with bottom
border, `h3` 12px uppercase secondary. Status dots are **square** (`border-radius: 0`).

### Anti-vibe rules (acceptance criteria, not polish)
- Red / black / white only. **No** gradients, **no** glow hover, **no** rainbow
  accents, **no** emoji or sparkles in the UI.
- **No cards inside cards.** Hover lift max 2–4px. 2–3 radius values max.
- Color is **never** the only signal — pair with a label, icon, or shape.
- Every async surface has **loading + skeleton + error + empty** states.
- Empty states say what data is missing and what the operator can do next.
- Direct operational copy. No "AI-powered insights", no fake testimonials, no
  placeholder persona names.
- Never write UI copy that claims data the bundle does not contain (see
  `plan.md` → "Missing From Bundle").

---

## 4. Layout (matches `mockup.html`)

```
┌───────────────────────────────────────────────────────────────────────┐
│ HEADER:  DĒJÅ VŪ   │  NOW ──time slider── +N MIN  │ [Meeting Room] [Hold to talk: Jarvis] │
├──────────────┬──────────────────────────────┬───────────────────────────┤
│ LEFT 300px   │ CENTER 1fr                   │ RIGHT 340px               │
│ Agent        │ Tactical Map (Canvas)        │ Situation Brief           │
│ Evidence:    │  + Divergence Alert overlay  │ Recommended Action        │
│  Air Marshal │  + Layer controls            │  (Reject / Modify / Preview)│
│  Weather Boy │                              │ Risk Queue                │
│  Domino      │                              │                           │
│  Historian   │                              │                           │
│  Auditor     │                              │                           │
└──────────────┴──────────────────────────────┴───────────────────────────┘
```

Grid: `grid-template-columns: 300px 1fr 340px`. The Time Warp slider lives in the
header (as in the mockup), not a separate bottom bar. Body is `height: 100vh;
overflow: hidden` — the three panels scroll internally.

Narrow/mobile fallback: stack Brief → Map → tabbed (Agents / Risks / Actions).

---

## 5. File structure (under `frontend/`)

```
frontend/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    main.tsx
    App.tsx
    styles/
      tokens.css        # the :root block above
      globals.css       # reset + base typography from mockup.html
    lib/
      types.ts          # mirror ALL API types from scaffolding.md (single source on FE)
      api.ts            # fetch wrapper; MOCK flag switches local JSON vs localhost:8000
      format.ts         # number/percent/delay formatting
      time.ts           # time-bin helpers, "+N MIN" labels
      projection.ts     # lat/lon -> canvas x/y (uses WEATHER_GRID bounds)
    state/
      store.ts          # Zustand store (see §8)
    data/mock/          # local copies of shared/sample-responses for mock-first
      scenarios.json
      scenario-summary.json
      scenario-state.json
      briefing.json
      action-preview.json
      roundtable.json   # NEW — meeting room sample
    components/
      TopBar.tsx
      TimeWarpSlider.tsx
      VoiceButton.tsx
      MeetingRoomButton.tsx
      TacticalMap.tsx        # Canvas render
      DivergenceAlert.tsx
      LayerControls.tsx
      AgentEvidencePanel.tsx
      AgentRow.tsx           # reused by panel AND meeting room
      SituationBrief.tsx
      RiskQueue.tsx
      ActionCards.tsx
      ConfidenceBar.tsx
      MeetingRoom.tsx        # NEW — full-screen round-table
      Skeletons.tsx
```

---

## 6. Component spec

Mirror all API types into `src/lib/types.ts` from `scaffolding.md` (they are the
single FE source of truth). For each component: note its **data source**, **props**,
and required **states**.

| Component | Data source | Notes / states |
|---|---|---|
| `TopBar` | — | Hosts brand, `TimeWarpSlider`, `MeetingRoomButton`, `VoiceButton`. |
| `TimeWarpSlider` | `time_bins[]` from `/summary` | Drives `/state` + `/briefing` fetch on change. Highlight bins with alert risk. |
| `VoiceButton` | — | Push-to-talk only. Hold → "LISTENING…". MVP: typed fallback, no live STT. |
| `MeetingRoomButton` | — | Opens `MeetingRoom`. Sits beside voice button. |
| `TacticalMap` | `/state` → `flights`, `sector_occupancy`, `weather_conflicts` | Canvas. Sectors colored by utilization (white→red ramp via opacity, not hue). Selectable sector/flight. Loading skeleton = dimmed grid. |
| `DivergenceAlert` | `briefing.confidence.divergence_alarm` | Overlay top of map. Only render when `is_active`. Mirrors mockup alert. |
| `LayerControls` | local state | Toggle sectors / weather / routes / conflicts. Functional, not decorative. |
| `AgentEvidencePanel` | `briefing.agents[]` | Left column. One `AgentRow` per agent. Skeleton rows while loading. |
| `AgentRow` | `AgentFinding` | Label (agent name), one headline metric (right-aligned mono), one detail line. Reused in Meeting Room. |
| `SituationBrief` | `/briefing` → `headline`, `summary`, `primary_risk` | Right column top. Readable in <10s. Red left-border accent (mockup). Cause/Impact lists. |
| `ActionCards` | `briefing.recommendations[]` | Reject / Modify / Preview. Only **Preview** calls `/actions/preview`; others update local state + toast. |
| `ConfidenceBar` | `briefing.confidence` | Single bar + support/weakness lines. No decimals theater — derive from real fields. |
| `RiskQueue` | `/summary` or `/state` → `risks[]`/`top_risks[]` | Sorted upcoming risks; selecting one focuses the map + brief. |
| `Skeletons` | — | Shared skeleton primitives for every async surface. |

Map color rule: encode utilization with **red opacity + a numeric label**, never a
rainbow ramp. Watch ≥ 85%, Alert ≥ 100% (`scaffolding.md` thresholds).

---

## 7. Agent Meeting Room (NEW feature)

A room where the operator talks to **all agents at once**, moderated by Jarvis.
Decided model: **Jarvis-moderated round-table**.

**Trigger.** `Meeting Room` button in the header, beside push-to-talk.

**UI.** Full-screen overlay (not a nested card — anti-vibe rule). Structure:
```
┌─────────────────────────────────────────────┐
│ AGENT MEETING ROOM                  [ close ]│
│ You: "What's the risk on HIGH_142?"          │  ← pinned question + input
├─────────────────────────────────────────────┤
│ Air Marshal  │ 118% cap in 18m, 22 flights   │
│ Weather Boy  │ Echo top 42k, E corridor      │  ← five agent lanes (AgentRow)
│ Domino       │ +247 min, ORD/EWR banks       │
│ Historian    │ 8 matches, 83% reroute        │
│ Auditor      │ storm +38% vs precedent       │
├─────────────────────────────────────────────┤
│ JARVIS (synthesis): Meter westbound flow …    │  ← distinct synthesis block
│                              [ View action → ]│  ← optional link to ActionCard
└─────────────────────────────────────────────┘
```

**Interaction.**
1. Operator types a question (or holds push-to-talk; MVP uses typed fallback).
2. Question fans out to the five specialists.
3. Each agent lane fills in with a **staggered** reveal (`--ease-standard`, ~80ms
   stagger). Each lane shows a loading shimmer until its response lands.
4. The **Jarvis synthesis** block renders last: one operational takeaway plus an
   optional deep-link to the relevant Action Card (`recommendation_id`).
5. `Esc` or `close` returns to the console; the room preserves the last exchange.

**Backend contract (new endpoint — frontend mocks `roundtable.json` first).**
```ts
// POST /api/agents/roundtable
type RoundtableRequest = {
  scenario_id: string;
  time_bin_id: string;
  question: string;
};

type RoundtableResponse = {
  question: string;
  agent_responses: {
    agent: AgentName;            // "Weather Boy" | "Air Marshal" | "Domino" | "Historian" | "Auditor"
    response: string;
    evidence: string[];
    severity: "info" | "watch" | "alert";
  }[];
  synthesis: {
    agent: "Jarvis";
    answer: string;
    recommendation_id: string | null;
  };
  generated_at: string;
};
```
Reuse the `AgentName` union and `AgentRow` styling from the contract. Add this
endpoint to `shared/api-contract.md` and ship a `roundtable.json` sample so the
room is fully demoable without the backend.

---

## 8. State model

Zustand store extends the `AppState` in `scaffolding.md`:

```ts
type AppState = {
  scenarioId: string | null;
  timeBinId: string | null;
  selectedRiskId: string | null;
  selectedSectorId: string | null;
  selectedFlightId: string | null;
  layers: { sectors: boolean; weather: boolean; routes: boolean; conflicts: boolean };
  briefingMode: "quick" | "detailed" | "full";   // quick is default

  meetingRoom: {
    open: boolean;
    question: string;
    loading: boolean;
    responses: RoundtableResponse | null;
  };
};
```

Async flags tracked per fetch (scenarios / summary / state / briefing / preview /
roundtable), each with `loading` + `error` + retry.

---

## 9. Build order (mock-first milestones)

1. **M1 — Static contract.** Scaffold Vite app, `tokens.css` + `globals.css` from
   the mockup, full 3-column layout, all components wired to `src/data/mock/*.json`
   (including `roundtable.json`). **Runs with no backend.** This is the demo-able
   skeleton.
2. **M2 — Real scenarios.** Flip `api.ts` `MOCK` flag → `http://localhost:8000`.
   Scenario selector + time bins live from `/scenarios` and `/summary`.
3. **M3 — Real risk.** Map + Risk Queue reflect real `/state` as the timeline moves.
4. **M4 — Briefing + preview + meeting room.** Situation Brief, Action Preview
   deltas, and the round-table wired to the backend.

Build to the **hero demo arc**: scrub Time Warp forward → a sector flashes red
before it breaches → the brief writes itself → open the Meeting Room → agents
respond and Jarvis synthesizes → Preview the action → the future re-computes.

---

## 10. Acceptance criteria

- Every anti-vibe rule in §3 holds (treated as pass/fail).
- Demo path completes in **under 3 minutes**.
- Every async surface has loading + skeleton + error + empty states.
- No UI copy claims data the bundle lacks; heuristics (delay estimate, risk score)
  are clearly labeled as operational heuristics, not certified predictions.
- App runs end-to-end against mocks (M1) with zero backend dependency.
