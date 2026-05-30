# Backend

FastAPI backend for DĒJÅ VŪ Intelligence.

## API Keys

Required for full production behavior:

- `OPENAI_API_KEY`: operator speech-to-text input through OpenAI transcription.
- `ANTHROPIC_API_KEY`: Claude brief generation.
- `ELEVENLABS_API_KEY`: Jarvis and agent text-to-speech output.

Optional for local development:

- `HACKATHON_DATA_BUNDLE`: overrides data bundle path.
- `OPENAI_TRANSCRIPTION_MODEL`: defaults to `gpt-4o-mini-transcribe`. Use `whisper-1` if classic Whisper is required.
- `USE_MOCK_TRANSCRIPTION=true`: forces deterministic mock operator voice input.
- `USE_MOCK_LLM=true`: forces deterministic mock briefings.
- `USE_MOCK_VOICE=true`: forces mock voice responses.

The backend runs without API keys. In that mode it uses deterministic mock transcription, briefings, and voice placeholders.

## Voice Split

Operator input:

- `POST /api/voice/transcribe`
- Provider: OpenAI Audio transcription
- Default model: `gpt-4o-mini-transcribe`
- Purpose: convert push-to-talk microphone audio into app commands such as "Jarvis, what am I missing?"

Agent output:

- `POST /api/voice/synthesize`
- Provider: ElevenLabs
- Purpose: speak Jarvis and agent briefing output back to the operator

## Chat Rooms

Default operator chat:

- `POST /api/chat/jarvis`
- Only Jarvis replies.
- Use this for the normal command surface outside the meeting room.

Meeting room chat:

- `POST /api/chat/meeting-room`
- Jarvis can moderate, and specialist agents can reply directly.
- Specialist agent voices are only enabled in this room.

Agent voice environment variables:

- `ELEVENLABS_VOICE_JARVIS`
- `ELEVENLABS_VOICE_WEATHER_BOY`
- `ELEVENLABS_VOICE_AIR_MARSHAL`
- `ELEVENLABS_VOICE_DOMINO`
- `ELEVENLABS_VOICE_HISTORIAN`
Until those are provided, all agents fall back to the default ElevenLabs voice ID.

## Forecast Scope Interactions

Agent roster:

- `GET /api/agents/roster`
- Returns Jarvis plus the meeting-room agents, default draggable positions, labels, roles, and voice IDs.

Map point click:

- `GET /api/scenarios/{scenario_id}/map/inspect?time_bin_id=...&lat=...&lon=...&altitude_ft=...`
- Returns sectors at that point, weather sample, nearby flights, matching risks, and recommended agents.

Sector click:

- `GET /api/scenarios/{scenario_id}/sectors/{sector_id}/detail?time_bin_id=...`
- Returns sector occupancy, contributing flights, conflicts, risks, and recommended agents.

Flight click:

- `GET /api/scenarios/{scenario_id}/flights/detail?time_bin_id=...&flight_id=...`
- Returns current flight position, sector, weather sample, route waypoints, and recommended agents.

Action card buttons:

- Preview: `POST /api/actions/preview`
- Accept / Modify / Reject: `POST /api/actions/decision`

These endpoints do not execute real air traffic actions. They record the operator decision and return the next UI step for the demo.

## Local Data

The backend auto-detects the bundle in this order:

1. `HACKATHON_DATA_BUNDLE`
2. repo-local `hackathon_data_bundle/`
3. repo-local `Hackathon Data Bundle/`
4. `/Users/hjoshi/Downloads/hackathon_data_bundle`

Raw data is ignored by git.

## Install

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Test

```bash
python -m unittest discover -s tests
```
