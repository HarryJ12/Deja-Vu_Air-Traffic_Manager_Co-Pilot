from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.core.schemas import FlightDetailResponse, MapInspectionResponse, SectorDetailResponse
from app.services.map_interaction_service import MapInteractionService

router = APIRouter(prefix="/api/scenarios", tags=["map"])
service = MapInteractionService()


@router.get("/{scenario_id}/map/inspect", response_model=MapInspectionResponse)
def inspect_point(
    scenario_id: str,
    time_bin_id: str = Query(...),
    lat: float = Query(...),
    lon: float = Query(...),
    altitude_ft: int | None = Query(None),
    nearby_limit: int = Query(8, ge=1, le=25),
) -> MapInspectionResponse:
    try:
        return service.inspect_point(scenario_id, time_bin_id, lat, lon, altitude_ft, nearby_limit)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{scenario_id}/sectors/{sector_id}/detail", response_model=SectorDetailResponse)
def sector_detail(
    scenario_id: str,
    sector_id: str,
    time_bin_id: str = Query(...),
) -> SectorDetailResponse:
    try:
        return service.sector_detail(scenario_id, time_bin_id, sector_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{scenario_id}/flights/detail", response_model=FlightDetailResponse)
def flight_detail(
    scenario_id: str,
    time_bin_id: str = Query(...),
    flight_id: str = Query(...),
) -> FlightDetailResponse:
    try:
        return service.flight_detail(scenario_id, time_bin_id, flight_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
