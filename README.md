# DĒJÅ VŪ -  Air Traffic Manager Co-Pilot 

<div align="center">

**AI-assisted air traffic foresight for weather, sector overload, and cascading delay**

[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776ab.svg)](https://www.python.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)

</div>

---

## Overview

Air traffic managers have access to vast amounts of operational and historical data, but in time-sensitive situations, they often lack the ability to rapidly synthesize that information into actionable decisions. 

The challenge is not data availability, but turning data into timely, high-confidence recommendations.

**DĒJÅ VŪ Intelligence** turns the Hackathon Data Bundle into:

- a live tactical radar view
- projected sector risk
- weather-aware route conflict detection
- **historical precedent retrieval**
- fast multi-agent reasoning
- voice-first operational briefings

The product is not an autopilot. It is a copilot that helps a human operator understand the situation, compare options, and make the final call.

---

## Key Features

- **Radar scope** with flights, sectors, airports, weather overlays, and risk zones
- **Time Warp** to scrub the forecast horizon and see aircraft/risk state change
- **Situation brief** generated from sector load, weather conflicts, recommendations, and agents
- **Risk queue** showing what is projected to break first and why
- **Action cards** for previewing, accepting, modifying, or rejecting recommendations
- **Agent cards** for Air Marshal, Weather, Domino, Risko, Historian, and Jarvis
- **Meeting room** where specialist agents debate the same operational scenario
- **Voice input** with push-to-talk transcription
- **ElevenLabs voice output** for Jarvis and specialist agents
- **Story mode** for a 3-minute judge-friendly demo with timed decisions and scoring

---

## Tech Stack

### Frontend

- React 18 + TypeScript
- Vite
- Zustand state management
- Canvas-based radar rendering
- Red, black, and white ASI-inspired design system

### Backend

- Python 3.11+
- FastAPI
- Pydantic
- NumPy
- Deterministic mock fallbacks for demo resilience

### AI + Voice

- Anthropic Claude for agent reasoning and briefing synthesis
- OpenAI transcription for operator speech input
- OpenAI chat for selected fast agent responses
- xAI/Grok for selected fast agent responses
- ElevenLabs for spoken agent output

### Data

- Hackathon Data Bundle
- Planned routes
- Synthetic ATC sectors
- HRRR-derived `refc` precipitation intensity
- HRRR-derived `retop` storm-top altitude

---

## Setup

### Prerequisites

- Node.js 18 or later
- Python 3.11 or later
- npm
- Hackathon Data Bundle available locally
- API keys for live AI and voice behavior

### Installation

1. **Clone the repository**

```bash
git clone <repo-url>
cd ASI_Hack
```

2. **Configure backend environment**

```bash
cd backend
cp .env.example .env
```

Update `backend/.env`:

```bash
HACKATHON_DATA_BUNDLE=/path/to/hackathon_data_bundle
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GROK_API_KEY=your_grok_key
ELEVENLABS_API_KEY=your_elevenlabs_key
```

3. **Install backend dependencies**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

4. **Start backend**

```bash
uvicorn app.main:app --reload --port 8000
```

5. **Install frontend dependencies**

```bash
cd ../frontend
npm install
```

6. **Start frontend**

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

To force story mode:

```text
http://127.0.0.1:5173/?demo=1
```

---

## Project Structure

```text
ASI_Hack/
├── backend/                 FastAPI backend
│   ├── app/
│   │   ├── api/             REST endpoints
│   │   ├── core/            dataset parsing, risk scoring, interpolation
│   │   └── services/        agents, chat, voice, scenario orchestration
│   ├── tests/               backend tests
│   └── pyproject.toml
├── frontend/                React/Vite frontend
│   ├── src/
│   │   ├── components/      radar, agents, meeting room, story mode
│   │   ├── data/mock/       frontend fallback fixtures
│   │   ├── lib/             API client, types, formatters
│   │   ├── state/           Zustand store
│   │   └── styles/          design tokens and component CSS
│   └── package.json
├── data/cache/              derived local cache
├── plan.md                  product and demo plan
└── scaffolding.md           API and architecture contract
```

---

## Data Flow

### Scenario Loading

```text
Hackathon Data Bundle
    ↓
backend/app/core/dataset.py
    ↓
routes + sectors + weather grids
    ↓
time bins + interpolated aircraft positions
    ↓
scenario summary/state API
    ↓
React radar + brief + risk queue
```

### Risk Detection

```text
Flight positions + planned routes
    ↓
Sector geometry + altitude bands
    ↓
Sector occupancy and capacity utilization
    ↓
Weather conflict sampling
    ↓
Risk scoring + confidence
    ↓
Briefing, risk queue, and action cards
```

### Voice + Agent Workflow

```text
Hold M / push-to-talk
    ↓
OpenAI transcription
    ↓
Jarvis or meeting-room router
    ↓
Claude / OpenAI / Grok agent response
    ↓
ElevenLabs synthesis
    ↓
Spoken response + chat transcript
```

---

## Core API

```text
GET  /api/health
GET  /api/scenarios
GET  /api/scenarios/{scenario_id}/summary
GET  /api/scenarios/{scenario_id}/state
GET  /api/scenarios/{scenario_id}/briefing
GET  /api/scenarios/{scenario_id}/map/inspect
GET  /api/scenarios/{scenario_id}/sectors/{sector_id}/detail
GET  /api/scenarios/{scenario_id}/flights/detail
GET  /api/agents/roster
POST /api/actions/preview
POST /api/actions/decision
POST /api/chat/jarvis
POST /api/chat/meeting-room
POST /api/voice/transcribe
POST /api/voice/synthesize
```

---

## Story Mode

The demo is built as a short interactive judge experience.

```text
Act 0: Judge enters name
Act 1: Ghost replay shows what happens if no one acts
Act 2: First decision on a projected sector breach
Act 3: Time Warp shows the storm diverging from history
Act 4: Meeting room agents debate the final call
Act 5: Scorecard ranks the judge against historical analogs
```

Decision rounds are timed. Each round has one best answer, and the final score is shown as `0/3` through `3/3`.

---

## Testing

### Backend

```bash
cd backend
python -m unittest discover -s tests
```

### Frontend

```bash
cd frontend
npm run build
```

---

## Deployment Notes

- Backend is a FastAPI app and should be deployed separately.
- Set production environment variables in the deployment provider.
- Do not commit `.env` files or the raw Hackathon Data Bundle.

---

## License

Copyright © 2026 DĒJÅ VŪ Intelligence. All rights reserved.

---

<div align="center">

**Built at Hacking the Fourth Dimension with ASI 2026**

</div>
