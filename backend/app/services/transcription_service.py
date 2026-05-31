from __future__ import annotations

import json
import mimetypes
import uuid
import urllib.error
import urllib.request

from app.config import get_settings
from app.core.schemas import VoiceTranscriptionResponse


MAX_AUDIO_BYTES = 25 * 1024 * 1024
MIN_AUDIO_BYTES = 512
SUPPORTED_AUDIO_TYPES = {
    "audio/webm": "webm",
    "audio/mp4": "mp4",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/oga": "oga",
    "audio/flac": "flac",
}


class OpenAITranscriptionError(RuntimeError):
    pass


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
        if len(audio) < MIN_AUDIO_BYTES:
            return VoiceTranscriptionResponse(
                mode="mock",
                provider="openai",
                model=model,
                text="",
                message="No speech was captured. Hold M while speaking, then release.",
            )

        if not self.settings.has_openai_transcription:
            return VoiceTranscriptionResponse(
                mode="mock",
                provider="openai",
                model=model,
                text="Jarvis, what am I missing?",
                message="Transcription is in mock mode. Set OPENAI_API_KEY and USE_MOCK_TRANSCRIPTION=false for live operator input.",
            )

        errors: list[str] = []
        for candidate in self._candidate_models(model):
            try:
                text = self._post_openai_transcription(audio, filename, content_type, candidate)
            except Exception as exc:
                errors.append(f"{candidate}: {exc}")
                continue

            return VoiceTranscriptionResponse(
                mode="live",
                provider="openai",
                model=candidate,
                text=text,
                message="Operator audio transcribed.",
            )

        return VoiceTranscriptionResponse(
            mode="mock",
            provider="openai",
            model=model,
            text="",
            message=f"OpenAI transcription failed: {' | '.join(errors)}",
        )

    def _post_openai_transcription(
        self,
        audio: bytes,
        filename: str,
        content_type: str | None,
        model: str,
    ) -> str:
        boundary = f"----deja-vu-{uuid.uuid4().hex}"
        upload_filename, file_type = self._normalize_upload(filename, content_type)
        body = self._multipart_body(
            boundary,
            fields={"model": model},
            files={"file": (upload_filename, file_type, audio)},
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
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace").strip()
            detail = self._openai_error_detail(body)
            raise OpenAITranscriptionError(f"HTTP {exc.code}: {detail}") from exc
        parsed = json.loads(payload)
        return str(parsed.get("text", "")).strip()

    def _candidate_models(self, model: str) -> list[str]:
        models = [model]
        if model != "whisper-1":
            models.append("whisper-1")
        return models

    def _normalize_upload(self, filename: str, content_type: str | None) -> tuple[str, str]:
        media_type = (content_type or "").split(";", 1)[0].strip().lower()
        guessed_type = mimetypes.guess_type(filename)[0]
        file_type = media_type or guessed_type or "audio/webm"
        extension = SUPPORTED_AUDIO_TYPES.get(file_type, "webm")
        safe_name = filename or f"operator-input.{extension}"
        stem = safe_name.rsplit(".", 1)[0] if "." in safe_name else safe_name
        if file_type not in SUPPORTED_AUDIO_TYPES:
            file_type = "audio/webm"
            extension = "webm"
        return f"{stem}.{extension}", file_type

    def _openai_error_detail(self, body: str) -> str:
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return body[:300] or "Bad Request"
        error = payload.get("error")
        if isinstance(error, dict):
            return str(error.get("message") or error)[:300]
        return body[:300] or "Bad Request"

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
