from __future__ import annotations

import numpy as np

from .geo import weather_index
from .schemas import FlightPosition, WeatherConflict, WeatherOverlayRef


def sample_weather(refc: np.ndarray, retop: np.ndarray, lat: float, lon: float) -> tuple[float, float] | None:
    index = weather_index(lat, lon)
    if index is None:
        return None
    row, col = index
    refc_value = float(refc[row, col])
    retop_value = float(retop[row, col])
    if refc_value <= -50 or retop_value < 0:
        return None
    return refc_value, retop_value


def compute_weather_conflicts(
    positions: list[FlightPosition],
    flight_sector: dict[str, str | None],
    refc: np.ndarray,
    retop: np.ndarray,
) -> list[WeatherConflict]:
    conflicts: list[WeatherConflict] = []
    for position in positions:
        sample = sample_weather(refc, retop, position.lat, position.lon)
        if sample is None:
            continue
        refc_value, retop_value = sample
        if refc_value >= 40 and retop_value >= position.altitude_ft:
            conflicts.append(
                WeatherConflict(
                    flight_id=position.flight_id,
                    sector_id=flight_sector.get(position.flight_id),
                    lat=round(position.lat, 5),
                    lon=round(position.lon, 5),
                    refc_dbz=round(refc_value, 1),
                    retop_ft=round(retop_value, 0),
                    altitude_ft=position.altitude_ft,
                    severity="alert" if refc_value >= 50 else "watch",
                )
            )
    return conflicts


def weather_overlay_refs(refc: np.ndarray, retop: np.ndarray, valid_from: str, valid_to: str, conflicts: list[WeatherConflict]):
    refc_valid = refc[refc > -50]
    retop_valid = retop[retop >= 0]
    return [
        WeatherOverlayRef(
            kind="refc",
            valid_from=valid_from,
            valid_to=valid_to,
            max_value=round(float(refc_valid.max()), 1) if refc_valid.size else None,
            conflict_count=len(conflicts),
        ),
        WeatherOverlayRef(
            kind="retop",
            valid_from=valid_from,
            valid_to=valid_to,
            max_value=round(float(retop_valid.max()), 0) if retop_valid.size else None,
            conflict_count=len(conflicts),
        ),
    ]
