from __future__ import annotations

from fastapi import APIRouter

from app.core.schemas import VoiceSynthesisRequest, VoiceSynthesisResponse
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/api/voice", tags=["voice"])
service = VoiceService()


@router.post("/synthesize", response_model=VoiceSynthesisResponse)
def synthesize(request: VoiceSynthesisRequest) -> VoiceSynthesisResponse:
    return service.synthesize(request.text, request.voice_id)
