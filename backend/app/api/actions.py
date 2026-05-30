from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.schemas import (
    ActionDecisionRequest,
    ActionDecisionResponse,
    ActionPreviewRequest,
    ActionPreviewResponse,
)
from app.services.action_preview_service import ActionPreviewService

router = APIRouter(prefix="/api/actions", tags=["actions"])
service = ActionPreviewService()


@router.post("/preview", response_model=ActionPreviewResponse)
def preview_action(request: ActionPreviewRequest) -> ActionPreviewResponse:
    try:
        return service.preview(request.scenario_id, request.time_bin_id, request.recommendation_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/decision", response_model=ActionDecisionResponse)
def decide_action(request: ActionDecisionRequest) -> ActionDecisionResponse:
    try:
        return service.decide(
            request.scenario_id,
            request.time_bin_id,
            request.recommendation_id,
            request.decision,
            request.operator_note,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
