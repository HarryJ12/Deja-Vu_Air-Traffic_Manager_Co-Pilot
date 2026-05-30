from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable


LAT_MIN = 21.943
LAT_MAX = 55.7765
LON_MIN = -135.0
LON_MAX = -67.5
ROWS = 256
COLS = 358


@dataclass(frozen=True)
class PreparedSector:
    sector_id: str
    altitude_band: str
    capacity: int
    altitude_from_ft: int
    altitude_to_ft: int
    ring: tuple[tuple[float, float], ...]
    bbox: tuple[float, float, float, float]


def flight_id(flight: dict) -> str:
    return f"{flight['flight_number']}|{flight['take_off_time']}|{flight['origin_airport_icao']}"


def haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_nm = 3440.065
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return 2 * radius_nm * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def cumulative_route_distances(lats: list[float], lons: list[float]) -> list[float]:
    if len(lats) != len(lons):
        raise ValueError("lats and lons must be the same length")
    distances = [0.0]
    total = 0.0
    for idx in range(1, len(lats)):
        total += haversine_nm(lats[idx - 1], lons[idx - 1], lats[idx], lons[idx])
        distances.append(total)
    return distances


def interpolate_route(lats: list[float], lons: list[float], progress: float) -> tuple[float, float]:
    if not lats or not lons:
        raise ValueError("route must include coordinates")
    if len(lats) == 1:
        return lats[0], lons[0]
    progress = max(0.0, min(1.0, progress))
    distances = cumulative_route_distances(lats, lons)
    total = distances[-1]
    if total <= 0:
        return lats[0], lons[0]
    target = total * progress
    for idx in range(1, len(distances)):
        if distances[idx] >= target:
            segment = distances[idx] - distances[idx - 1]
            local = 0.0 if segment <= 0 else (target - distances[idx - 1]) / segment
            lat = lats[idx - 1] + (lats[idx] - lats[idx - 1]) * local
            lon = lons[idx - 1] + (lons[idx] - lons[idx - 1]) * local
            return lat, lon
    return lats[-1], lons[-1]


def weather_index(lat: float, lon: float) -> tuple[int, int] | None:
    if lat < LAT_MIN or lat > LAT_MAX or lon < LON_MIN or lon > LON_MAX:
        return None
    row = int((LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * ROWS)
    col = int((lon - LON_MIN) / (LON_MAX - LON_MIN) * COLS)
    if row < 0 or row >= ROWS or col < 0 or col >= COLS:
        return None
    return row, col


def point_in_ring(lon: float, lat: float, ring: Iterable[tuple[float, float]]) -> bool:
    points = list(ring)
    inside = False
    j = len(points) - 1
    for i, (xi, yi) in enumerate(points):
        xj, yj = points[j]
        intersects = (yi > lat) != (yj > lat)
        if intersects:
            x_at_y = (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi
            if lon < x_at_y:
                inside = not inside
        j = i
    return inside


def prepare_sectors(sector_geojson: dict) -> list[PreparedSector]:
    prepared = []
    for feature in sector_geojson["features"]:
        props = feature["properties"]
        coords = feature["geometry"]["coordinates"][0]
        ring = tuple((float(lon), float(lat)) for lon, lat in coords)
        lons = [lon for lon, _ in ring]
        lats = [lat for _, lat in ring]
        name = props["name"]
        prepared.append(
            PreparedSector(
                sector_id=name,
                altitude_band=name.split("_", 1)[0],
                capacity=int(props["capacity"]),
                altitude_from_ft=int(props["altitude_from_ft"]),
                altitude_to_ft=int(props["altitude_to_ft"]),
                ring=ring,
                bbox=(min(lons), min(lats), max(lons), max(lats)),
            )
        )
    return prepared


def find_sector(lon: float, lat: float, altitude_ft: int, sectors: list[PreparedSector]) -> PreparedSector | None:
    for sector in sectors:
        if not (sector.altitude_from_ft <= altitude_ft < sector.altitude_to_ft):
            continue
        min_lon, min_lat, max_lon, max_lat = sector.bbox
        if lon < min_lon or lon > max_lon or lat < min_lat or lat > max_lat:
            continue
        if point_in_ring(lon, lat, sector.ring):
            return sector
    return None
