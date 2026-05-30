from __future__ import annotations

from fastapi import APIRouter

from app.core.schemas import AgentRosterResponse
from app.services.agent_service import AgentService

router = APIRouter(prefix="/api/agents", tags=["agents"])
service = AgentService()


@router.get("/roster", response_model=AgentRosterResponse)
def agent_roster() -> AgentRosterResponse:
    return service.roster()
