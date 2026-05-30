from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def _load_dotenv() -> None:
    for path in [REPO_ROOT / ".env", REPO_ROOT / "backend" / ".env"]:
        if not path.exists():
            continue
        for raw_line in path.read_text().splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


@dataclass(frozen=True)
class Settings:
    data_bundle_path: Path | None
    openai_api_key: str | None
    anthropic_api_key: str | None
    elevenlabs_api_key: str | None
    openai_transcription_model: str
    agent_voice_ids: dict[str, str]
    use_mock_transcription: bool
    use_mock_llm: bool
    use_mock_voice: bool
    cache_dir: Path

    @property
    def has_openai_transcription(self) -> bool:
        return bool(self.openai_api_key) and not self.use_mock_transcription

    @property
    def has_anthropic(self) -> bool:
        return bool(self.anthropic_api_key) and not self.use_mock_llm

    @property
    def has_elevenlabs(self) -> bool:
        return bool(self.elevenlabs_api_key) and not self.use_mock_voice


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def discover_data_bundle() -> Path | None:
    env_path = os.getenv("HACKATHON_DATA_BUNDLE")
    candidates = []
    if env_path:
        candidates.append(Path(env_path).expanduser())
    candidates.extend(
        [
            REPO_ROOT / "hackathon_data_bundle",
            REPO_ROOT / "Hackathon Data Bundle",
            Path.home() / "Downloads" / "hackathon_data_bundle",
        ]
    )
    for candidate in candidates:
        if (candidate / "sectors.geojson").exists() and any(candidate.glob("asked_at_*/routes.json")):
            return candidate
    return None


def get_settings() -> Settings:
    _load_dotenv()
    return Settings(
        data_bundle_path=discover_data_bundle(),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
        elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY"),
        openai_transcription_model=os.getenv("OPENAI_TRANSCRIPTION_MODEL", "gpt-4o-mini-transcribe"),
        agent_voice_ids={
            "Jarvis": os.getenv("ELEVENLABS_VOICE_JARVIS", "VtiJxTGG57AFTSQjMlja"),
            "Weather Boy": os.getenv("ELEVENLABS_VOICE_WEATHER_BOY", "FmJ4FDkdrYIKzBTruTkV"),
            "Air Marshal": os.getenv("ELEVENLABS_VOICE_AIR_MARSHAL", "DcLiO3XaUWTu3gyon6hW"),
            "Domino": os.getenv("ELEVENLABS_VOICE_DOMINO", "tnVKC6NjwhdRxoQIfKue"),
            "Historian": os.getenv("ELEVENLABS_VOICE_HISTORIAN", "Ybqj6CIlqb6M85s9Bl4n"),
        },
        use_mock_transcription=_env_bool("USE_MOCK_TRANSCRIPTION", True),
        use_mock_llm=_env_bool("USE_MOCK_LLM", True),
        use_mock_voice=_env_bool("USE_MOCK_VOICE", True),
        cache_dir=REPO_ROOT / "data" / "cache",
    )
