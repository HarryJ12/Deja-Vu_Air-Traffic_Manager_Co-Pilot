# Backend

FastAPI backend for DĒJÅ VŪ Intelligence.

## API Keys

Required for full production behavior:

- `ANTHROPIC_API_KEY`: Claude brief generation.
- `ELEVENLABS_API_KEY`: voice synthesis.

Optional for local development:

- `HACKATHON_DATA_BUNDLE`: overrides data bundle path.
- `USE_MOCK_LLM=true`: forces deterministic mock briefings.
- `USE_MOCK_VOICE=true`: forces mock voice responses.

The backend runs without API keys. In that mode it uses deterministic mock briefings and voice placeholders.

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
