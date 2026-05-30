from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import numpy as np

from app.config import get_settings

from .time_bins import parse_iso, weather_time_bins


class DataBundleNotFound(RuntimeError):
    pass


class ScenarioNotFound(KeyError):
    pass


class DataBundle:
    def __init__(self, root: Path | None = None):
        self.root = root or get_settings().data_bundle_path
        self._explicit_root = root

    def _root(self) -> Path:
        if self.root is None:
            self.root = self._explicit_root or get_settings().data_bundle_path
        if self.root is None:
            raise DataBundleNotFound(
                "Hackathon data bundle not found. Set HACKATHON_DATA_BUNDLE or place it in the repo."
            )
        return self.root

    def scenario_dirs(self) -> list[Path]:
        return sorted(path for path in self._root().glob("asked_at_*") if path.is_dir())

    def scenario_ids(self) -> list[str]:
        return [path.name for path in self.scenario_dirs()]

    def scenario_dir(self, scenario_id: str) -> Path:
        path = self._root() / scenario_id
        if not path.exists():
            raise ScenarioNotFound(scenario_id)
        return path

    @lru_cache(maxsize=32)
    def load_routes(self, scenario_id: str) -> dict:
        path = self.scenario_dir(scenario_id) / "routes.json"
        with path.open() as f:
            return json.load(f)

    @lru_cache(maxsize=1)
    def load_sectors(self) -> dict:
        path = self._root() / "sectors.geojson"
        with path.open() as f:
            return json.load(f)

    def weather_files(self, scenario_id: str, kind: str) -> list[Path]:
        return sorted((self.scenario_dir(scenario_id) / "wx" / kind).glob("*.npz"))

    @lru_cache(maxsize=32)
    def time_bins(self, scenario_id: str):
        return weather_time_bins(self.weather_files(scenario_id, "refc"))

    def time_bin_by_id(self, scenario_id: str, time_bin_id: str):
        for item in self.time_bins(scenario_id):
            if item.id == time_bin_id:
                return item
        raise KeyError(time_bin_id)

    def weather_file_for_bin(self, scenario_id: str, kind: str, time_bin_id: str) -> Path:
        target = self.time_bin_by_id(scenario_id, time_bin_id)
        for path in self.weather_files(scenario_id, kind):
            parsed = weather_time_bins([path])[0]
            if parsed.valid_from == target.valid_from:
                return path
        raise KeyError(f"{kind}:{time_bin_id}")

    @lru_cache(maxsize=16)
    def load_weather_matrix(self, scenario_id: str, kind: str, time_bin_id: str):
        path = self.weather_file_for_bin(scenario_id, kind, time_bin_id)
        return np.load(path)["matrix"]

    def scenario_summary_meta(self, scenario_id: str) -> dict:
        routes = self.load_routes(scenario_id)
        bins = self.time_bins(scenario_id)
        asked_at = parse_iso(routes["asked_at"])
        active_bin = min(
            bins,
            key=lambda item: abs((parse_iso(item.valid_from) - asked_at).total_seconds()),
        )
        return {
            "id": scenario_id,
            "asked_at": routes["asked_at"].replace("+00:00", "Z"),
            "flight_count": len(routes["flights"]),
            "time_bin_count": len(bins),
            "window_start": routes["window_start"].replace("+00:00", "Z"),
            "window_end": routes["window_end"].replace("+00:00", "Z"),
            "initial_time_bin_id": active_bin.id,
        }
