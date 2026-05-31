# DĒJÅ VŪ Intelligence — Frontend

Operational console for traffic flow managers. Vite + React + TypeScript.
See `frontend.md` for the full build guide.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

Runs against the real backend by default so the radar, risk queue, and briefing
move with the Hackathon Data Bundle.

## Mock-only mode

The dev server proxies `/api` → `http://localhost:8000`. For frontend-only work
with zero backend dependency, set the mock flag before running:

```bash
# PowerShell
$env:VITE_USE_MOCK="1"; npm run dev
```

## Build

```bash
npm run build    # tsc -b && vite build
```

## Layout

- `src/lib/types.ts` — API types, mirrored from `scaffolding.md` (keep in sync with backend).
- `src/lib/api.ts` — fetch layer with live-backend default and `VITE_USE_MOCK` switch.
- `src/state/store.ts` — Zustand store (scenario / time / selection / meeting room).
- `src/components/` — TopBar, TacticalMap (canvas), SituationBrief, AgentEvidencePanel,
  RiskQueue, ActionCards, MeetingRoom, etc.
