from __future__ import annotations

import base64
import json
import urllib.request

from app.config import get_settings
from app.core.schemas import VoiceSynthesisResponse


DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"


class AgentVoiceNotAllowed(ValueError):
    pass


class VoiceService:
    def __init__(self):
        self.settings = get_settings()

    def voice_id_for_agent(self, agent: str = "Jarvis") -> str:
        return self.settings.agent_voice_ids.get(agent, DEFAULT_VOICE_ID)

    def synthesize(
        self,
        text: str,
        voice_id: str | None = None,
        agent: str = "Jarvis",
        meeting_room: bool = False,
    ) -> VoiceSynthesisResponse:
        if agent != "Jarvis" and not meeting_room:
            raise AgentVoiceNotAllowed(
                "Non-Jarvis agent voices are only available inside the meeting room."
            )

        if not self.settings.has_elevenlabs:
            return VoiceSynthesisResponse(
                mode="mock",
                content_type="text/plain",
                audio_base64=None,
                message="Voice synthesis is in mock mode. Set ELEVENLABS_API_KEY and USE_MOCK_VOICE=false for live audio.",
            )

        selected_voice = voice_id or self.voice_id_for_agent(agent)
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{selected_voice}"
        payload = json.dumps(
            {
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {"stability": 0.45, "similarity_boost": 0.7},
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            method="POST",
            headers={
                "xi-api-key": self.settings.elevenlabs_api_key or "",
                "content-type": "application/json",
                "accept": "audio/mpeg",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                audio = response.read()
        except Exception as exc:
            return VoiceSynthesisResponse(
                mode="mock",
                content_type="text/plain",
                audio_base64=None,
                message=f"ElevenLabs request failed, falling back to mock voice: {exc}",
            )

        return VoiceSynthesisResponse(
            mode="live",
            content_type="audio/mpeg",
            audio_base64=base64.b64encode(audio).decode("ascii"),
            message="Voice synthesized.",
        )
