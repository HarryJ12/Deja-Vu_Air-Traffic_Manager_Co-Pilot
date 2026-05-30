from __future__ import annotations

from collections import defaultdict

from .geo import PreparedSector, find_sector
from .schemas import FlightPosition, SectorOccupancy


def sector_for_position(position: FlightPosition, sectors: list[PreparedSector]) -> PreparedSector | None:
    return find_sector(position.lon, position.lat, position.altitude_ft, sectors)


def compute_sector_occupancy(
    positions: list[FlightPosition],
    sectors: list[PreparedSector],
) -> tuple[list[SectorOccupancy], dict[str, str | None]]:
    counts: dict[str, list[str]] = defaultdict(list)
    flight_sector: dict[str, str | None] = {}
    sector_lookup = {sector.sector_id: sector for sector in sectors}

    for position in positions:
        sector = sector_for_position(position, sectors)
        flight_sector[position.flight_id] = sector.sector_id if sector else None
        if sector:
            counts[sector.sector_id].append(position.flight_id)

    rows: list[SectorOccupancy] = []
    for sector_id, flight_ids in counts.items():
        sector = sector_lookup[sector_id]
        count = len(flight_ids)
        utilization = (count / sector.capacity * 100) if sector.capacity else 0
        rows.append(
            SectorOccupancy(
                sector_id=sector_id,
                altitude_band=sector.altitude_band,  # type: ignore[arg-type]
                count=count,
                capacity=sector.capacity,
                utilization_pct=round(utilization, 1),
                overload_count=max(0, count - sector.capacity),
                contributing_flight_ids=flight_ids[:50],
            )
        )

    rows.sort(key=lambda item: item.utilization_pct, reverse=True)
    return rows, flight_sector
