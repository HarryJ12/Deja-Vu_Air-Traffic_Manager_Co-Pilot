from __future__ import annotations

from datetime import datetime

from .geo import flight_id, interpolate_route
from .schemas import FlightPosition
from .time_bins import parse_iso


def interpolate_flight(flight: dict, at_time: datetime) -> FlightPosition | None:
    takeoff = parse_iso(flight["take_off_time"])
    landing = parse_iso(flight["scheduled_landing_time"])
    if at_time < takeoff or at_time > landing:
        return None
    duration = (landing - takeoff).total_seconds()
    progress = 1.0 if duration <= 0 else (at_time - takeoff).total_seconds() / duration
    lat, lon = interpolate_route(flight["lats"], flight["lons"], progress)
    return FlightPosition(
        flight_id=flight_id(flight),
        flight_number=flight["flight_number"],
        lat=lat,
        lon=lon,
        altitude_ft=int(flight["cruise_altitude_ft"]),
        speed_kt=int(flight["cruise_speed_kt"]),
        origin=flight["origin_airport_icao"],
        destination=flight["destination_airport_icao"],
        progress_pct=round(max(0.0, min(1.0, progress)) * 100, 1),
    )


def active_flight_positions(flights: list[dict], at_time: datetime, limit: int | None = None) -> list[FlightPosition]:
    positions = []
    for flight in flights:
        position = interpolate_flight(flight, at_time)
        if position is not None:
            positions.append(position)
            if limit and len(positions) >= limit:
                break
    return positions
