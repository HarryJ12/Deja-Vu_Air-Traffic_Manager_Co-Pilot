from __future__ import annotations

import base64
import json
import urllib.error
import urllib.parse
import urllib.request

from app.config import get_settings
from app.core.schemas import VoiceSynthesisResponse


DEFAULT_VOICE_ID = "VtiJxTGG57AFTSQjMlja"


class AgentVoiceNotAllowed(ValueError):
    pass


class VoiceService:
    def __init__(self):
        self.settings = get_settings()

    def voice_id_for_agent(self, agent: str = "Jarvis") -> str:
        self.settings = get_settings()
        return self.settings.agent_voice_ids.get(agent, DEFAULT_VOICE_ID)

    def _unplayable(
        self,
        message: str,
        agent: str,
        voice_id: str,
        error_code: str,
    ) -> VoiceSynthesisResponse:
        return VoiceSynthesisResponse(
            mode="mock",
            content_type="text/plain",
            audio_base64=None,
            message=message,
            agent=agent,  # type: ignore[arg-type]
            voice_id=voice_id,
            is_playable=False,
            audio_bytes=0,
            error_code=error_code,
        )

    def synthesize(
        self,
        text: str,
        voice_id: str | None = None,
        agent: str = "Jarvis",
        meeting_room: bool = False,
    ) -> VoiceSynthesisResponse:
        self.settings = get_settings()
        selected_voice = voice_id or self.voice_id_for_agent(agent)

        if agent != "Jarvis" and not meeting_room:
            raise AgentVoiceNotAllowed(
                "Non-Jarvis agent voices are only available inside the meeting room."
            )

        if not self.settings.has_elevenlabs:
            reason = (
                "USE_MOCK_VOICE=true is forcing mock voice."
                if self.settings.use_mock_voice
                else "ELEVENLABS_API_KEY is not set for the backend."
            )
            return self._unplayable(
                f"ElevenLabs live audio unavailable: {reason}",
                agent,
                selected_voice,
                "elevenlabs_unavailable",
            )

        voice_path = urllib.parse.quote(selected_voice, safe="")
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_path}?output_format=mp3_44100_128"
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
                content_type = response.headers.get("content-type", "audio/mpeg").split(";")[0]
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace").strip()
            detail = body[:300] if body else str(exc)
            return self._unplayable(
                f"ElevenLabs request failed with HTTP {exc.code}: {detail}",
                agent,
                selected_voice,
                f"elevenlabs_http_{exc.code}",
            )
        except Exception as exc:
            return self._unplayable(
                f"ElevenLabs request failed before audio playback: {exc}",
                agent,
                selected_voice,
                "elevenlabs_request_failed",
            )

        if not audio:
            return self._unplayable(
                "ElevenLabs returned an empty audio payload.",
                agent,
                selected_voice,
                "elevenlabs_empty_audio",
            )

        if not content_type.startswith("audio/"):
            preview = audio[:200].decode("utf-8", errors="replace")
            return self._unplayable(
                f"ElevenLabs returned non-audio content ({content_type}): {preview}",
                agent,
                selected_voice,
                "elevenlabs_non_audio",
            )

        return VoiceSynthesisResponse(
            mode="live",
            content_type=content_type,
            audio_base64=base64.b64encode(audio).decode("ascii"),
            message="Voice synthesized.",
            agent=agent,  # type: ignore[arg-type]
            voice_id=selected_voice,
            is_playable=True,
            audio_bytes=len(audio),
            error_code=None,
        )
