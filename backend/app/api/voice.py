from __future__ import annotations

from fastapi import APIRouter, File, UploadFile

from app.core.schemas import VoiceSynthesisRequest, VoiceSynthesisResponse, VoiceTranscriptionResponse
from app.services.transcription_service import TranscriptionService
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/api/voice", tags=["voice"])
synthesis_service = VoiceService()
transcription_service = TranscriptionService()


@router.post("/synthesize", response_model=VoiceSynthesisResponse)
def synthesize(request: VoiceSynthesisRequest) -> VoiceSynthesisResponse:
    return synthesis_service.synthesize(request.text, request.voice_id)


@router.post("/transcribe", response_model=VoiceTranscriptionResponse)
async def transcribe(audio: UploadFile = File(...)) -> VoiceTranscriptionResponse:
    data = await audio.read()
    return transcription_service.transcribe(data, audio.filename or "audio.webm", audio.content_type)
