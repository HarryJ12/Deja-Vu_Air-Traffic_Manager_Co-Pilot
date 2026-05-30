from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.core.schemas import BriefingResponse
from app.services.briefing_service import BriefingService

router = APIRouter(prefix="/api/scenarios", tags=["briefings"])
service = BriefingService()


@router.get("/{scenario_id}/briefing", response_model=BriefingResponse)
def briefing(
    scenario_id: str,
    time_bin_id: str = Query(...),
    mode: str = Query("quick"),
) -> BriefingResponse:
    try:
        return service.briefing(scenario_id, time_bin_id, mode)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
