from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.actions import router as actions_router
from app.api.briefings import router as briefings_router
from app.api.chat import router as chat_router
from app.api.scenarios import router as scenarios_router
from app.api.voice import router as voice_router
from app.config import get_settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="DĒJÅ VŪ Intelligence API",
        version="0.1.0",
        description="Operational comprehension backend for ASI hackathon air traffic scenarios.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(scenarios_router)
    app.include_router(briefings_router)
    app.include_router(actions_router)
    app.include_router(voice_router)
    app.include_router(chat_router)

    @app.get("/api/health")
    def health():
        settings = get_settings()
        return {
            "ok": True,
            "data_bundle_found": settings.data_bundle_path is not None,
            "data_bundle_path": str(settings.data_bundle_path) if settings.data_bundle_path else None,
            "transcription_mode": "live" if settings.has_openai_transcription else "mock",
            "transcription_model": settings.openai_transcription_model,
            "claude_mode": "live" if settings.has_anthropic else "mock",
            "voice_mode": "live" if settings.has_elevenlabs else "mock",
        }

    return app


app = create_app()
