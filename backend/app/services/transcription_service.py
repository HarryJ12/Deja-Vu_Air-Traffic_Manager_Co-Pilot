from __future__ import annotations

import json
import mimetypes
import uuid
import urllib.request

from app.config import get_settings
from app.core.schemas import VoiceTranscriptionResponse


MAX_AUDIO_BYTES = 25 * 1024 * 1024


class TranscriptionService:
    """OpenAI transcription for operator voice input.

    ElevenLabs remains the output voice provider. This service only turns the
    operator's microphone upload into text for the app command interface.
    """

    def __init__(self):
        self.settings = get_settings()

    def transcribe(self, audio: bytes, filename: str, content_type: str | None) -> VoiceTranscriptionResponse:
        model = self.settings.openai_transcription_model
        if len(audio) > MAX_AUDIO_BYTES:
            return VoiceTranscriptionResponse(
                mode="mock",
                provider="openai",
                model=model,
                text="",
                message="Audio exceeds the 25 MB transcription upload limit.",
            )

        if not self.settings.has_openai_transcription:
            return VoiceTranscriptionResponse(
                mode="mock",
                provider="openai",
                model=model,
                text="Jarvis, what am I missing?",
                message="Transcription is in mock mode. Set OPENAI_API_KEY and USE_MOCK_TRANSCRIPTION=false for live operator input.",
            )

        try:
            text = self._post_openai_transcription(audio, filename, content_type, model)
        except Exception as exc:
            return VoiceTranscriptionResponse(
                mode="mock",
                provider="openai",
                model=model,
                text="",
                message=f"OpenAI transcription failed, falling back to mock mode: {exc}",
            )

        return VoiceTranscriptionResponse(
            mode="live",
            provider="openai",
            model=model,
            text=text,
            message="Operator audio transcribed.",
        )

    def _post_openai_transcription(
        self,
        audio: bytes,
        filename: str,
        content_type: str | None,
        model: str,
    ) -> str:
        boundary = f"----deja-vu-{uuid.uuid4().hex}"
        file_type = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
        body = self._multipart_body(
            boundary,
            fields={"model": model, "response_format": "json"},
            files={"file": (filename or "audio.webm", file_type, audio)},
        )
        request = urllib.request.Request(
            "https://api.openai.com/v1/audio/transcriptions",
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {self.settings.openai_api_key}",
                "Content-Type": f"multipart/form-data; boundary={boundary}",
            },
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = response.read().decode("utf-8")
        parsed = json.loads(payload)
        return str(parsed.get("text", "")).strip()

    def _multipart_body(
        self,
        boundary: str,
        fields: dict[str, str],
        files: dict[str, tuple[str, str, bytes]],
    ) -> bytes:
        chunks: list[bytes] = []
        for name, value in fields.items():
            chunks.extend(
                [
                    f"--{boundary}\r\n".encode("utf-8"),
                    f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"),
                    value.encode("utf-8"),
                    b"\r\n",
                ]
            )
        for name, (filename, content_type, data) in files.items():
            chunks.extend(
                [
                    f"--{boundary}\r\n".encode("utf-8"),
                    (
                        f'Content-Disposition: form-data; name="{name}"; '
                        f'filename="{filename}"\r\n'
                    ).encode("utf-8"),
                    f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
                    data,
                    b"\r\n",
                ]
            )
        chunks.append(f"--{boundary}--\r\n".encode("utf-8"))
        return b"".join(chunks)
