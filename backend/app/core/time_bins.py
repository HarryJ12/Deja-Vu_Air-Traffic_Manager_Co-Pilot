from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path

from .schemas import TimeBin


WX_RE = re.compile(
    r"(?P<based>\d{4}-\d{2}-\d{2}_\d{2}:\d{2}:\d{2})_"
    r"(?P<start>\d{4}-\d{2}-\d{2}_\d{2}:\d{2}:\d{2})_"
    r"(?P<end>\d{4}-\d{2}-\d{2}_\d{2}:\d{2}:\d{2})\.npz$"
)


def parse_iso(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def parse_wx_stamp(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d_%H:%M:%S").replace(tzinfo=timezone.utc)


def iso_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_weather_filename(path: Path) -> dict[str, datetime]:
    match = WX_RE.match(path.name)
    if not match:
        raise ValueError(f"Invalid weather filename: {path.name}")
    return {
        "based_at": parse_wx_stamp(match.group("based")),
        "valid_from": parse_wx_stamp(match.group("start")),
        "valid_to": parse_wx_stamp(match.group("end")),
    }


def weather_time_bins(refc_files: list[Path]) -> list[TimeBin]:
    bins = []
    for path in sorted(refc_files):
        parsed = parse_weather_filename(path)
        valid_from = parsed["valid_from"]
        valid_to = parsed["valid_to"]
        bins.append(
            TimeBin(
                id=valid_from.strftime("%Y%m%dT%H%M%SZ"),
                valid_from=iso_z(valid_from),
                valid_to=iso_z(valid_to),
                label=valid_from.strftime("%H:%MZ"),
                based_at=iso_z(parsed["based_at"]),
            )
        )
    return bins


def time_bin_midpoint(time_bin: TimeBin) -> datetime:
    start = parse_iso(time_bin.valid_from)
    end = parse_iso(time_bin.valid_to)
    return start + (end - start) / 2
