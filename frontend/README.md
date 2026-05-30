# DĒJÅ VŪ Intelligence — Frontend

Operational console for traffic flow managers. Vite + React + TypeScript.
See `frontend.md` for the full build guide.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

Runs **mock-first** with zero backend dependency (M1). All data is served from
`src/data/mock/*.json` via `src/lib/api.ts`.

## Switch to the real backend (M2+)

The dev server proxies `/api` → `http://localhost:8000`. To hit the real API,
set the flag before running:

```bash
# PowerShell
$env:VITE_USE_BACKEND="1"; npm run dev
```

## Build

```bash
npm run build    # tsc -b && vite build
```

## Layout

- `src/lib/types.ts` — API types, mirrored from `scaffolding.md` (keep in sync with backend).
- `src/lib/api.ts` — fetch layer with `MOCK` switch.
- `src/state/store.ts` — Zustand store (scenario / time / selection / meeting room).
- `src/components/` — TopBar, TacticalMap (canvas), SituationBrief, AgentEvidencePanel,
  RiskQueue, ActionCards, MeetingRoom, etc.
