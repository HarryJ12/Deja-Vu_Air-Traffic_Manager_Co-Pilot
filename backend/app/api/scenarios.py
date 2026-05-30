from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.core.dataset import DataBundleNotFound, ScenarioNotFound
from app.core.schemas import ScenarioListResponse, ScenarioStateResponse, ScenarioSummaryResponse
from app.services.scenario_service import ScenarioService

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])
service = ScenarioService()


@router.get("", response_model=ScenarioListResponse)
def list_scenarios() -> ScenarioListResponse:
    try:
        return ScenarioListResponse(scenarios=service.list_scenarios())
    except DataBundleNotFound as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/{scenario_id}/summary", response_model=ScenarioSummaryResponse)
def scenario_summary(scenario_id: str) -> ScenarioSummaryResponse:
    try:
        return service.scenario_summary(scenario_id)
    except ScenarioNotFound as exc:
        raise HTTPException(status_code=404, detail=f"Unknown scenario: {scenario_id}") from exc


@router.get("/{scenario_id}/state", response_model=ScenarioStateResponse)
def scenario_state(
    scenario_id: str,
    time_bin_id: str = Query(...),
) -> ScenarioStateResponse:
    try:
        return service.scenario_state(scenario_id, time_bin_id)
    except ScenarioNotFound as exc:
        raise HTTPException(status_code=404, detail=f"Unknown scenario: {scenario_id}") from exc
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown time bin: {time_bin_id}") from exc
