from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.schemas import ChatRequest, ChatResponse, MeetingRoomChatRequest
from app.services.ai_service import ClaudeProviderError
from app.services.chat_service import ChatService

router = APIRouter(prefix="/api/chat", tags=["chat"])
service = ChatService()


@router.post("/jarvis", response_model=ChatResponse)
def jarvis_chat(request: ChatRequest) -> ChatResponse:
    try:
        return service.jarvis_chat(request)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ClaudeProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/meeting-room", response_model=ChatResponse)
def meeting_room_chat(request: MeetingRoomChatRequest) -> ChatResponse:
    try:
        return service.meeting_room_chat(request)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ClaudeProviderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
