from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.schemas import ActionPreviewRequest, ActionPreviewResponse
from app.services.action_preview_service import ActionPreviewService

router = APIRouter(prefix="/api/actions", tags=["actions"])
service = ActionPreviewService()


@router.post("/preview", response_model=ActionPreviewResponse)
def preview_action(request: ActionPreviewRequest) -> ActionPreviewResponse:
    try:
        return service.preview(request.scenario_id, request.time_bin_id, request.recommendation_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
