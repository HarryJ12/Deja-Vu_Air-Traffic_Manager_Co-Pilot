from __future__ import annotations

import sys
import unittest
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.config import discover_data_bundle
from app.core.dataset import DataBundle
from app.core.flight_interpolation import interpolate_flight
from app.core.geo import interpolate_route, weather_index
from app.core.time_bins import parse_iso


class CoreTests(unittest.TestCase):
    def test_weather_index_bounds(self):
        self.assertEqual(weather_index(55.7765, -135.0), (0, 0))
        self.assertIsNotNone(weather_index(39.0, -97.0))
        self.assertIsNone(weather_index(10.0, -97.0))

    def test_route_interpolation(self):
        lat, lon = interpolate_route([0.0, 0.0], [0.0, 10.0], 0.5)
        self.assertAlmostEqual(lat, 0.0, places=3)
        self.assertAlmostEqual(lon, 5.0, places=1)

    def test_data_bundle_discovery(self):
        root = discover_data_bundle()
        self.assertIsNotNone(root)
        bundle = DataBundle(root)
        scenarios = bundle.scenario_ids()
        self.assertGreaterEqual(len(scenarios), 1)
        routes = bundle.load_routes(scenarios[0])
        self.assertIn("flights", routes)
        self.assertGreater(len(bundle.time_bins(scenarios[0])), 1)

    def test_flight_interpolation_endpoints(self):
        root = discover_data_bundle()
        if root is None:
            self.skipTest("No data bundle available")
        bundle = DataBundle(root)
        scenario_id = bundle.scenario_ids()[0]
        flight = bundle.load_routes(scenario_id)["flights"][0]
        start = parse_iso(flight["take_off_time"])
        end = parse_iso(flight["scheduled_landing_time"])
        at_start = interpolate_flight(flight, start)
        at_end = interpolate_flight(flight, end)
        self.assertIsNotNone(at_start)
        self.assertIsNotNone(at_end)
        self.assertAlmostEqual(at_start.lat, flight["lats"][0], places=4)
        self.assertAlmostEqual(at_end.lon, flight["lons"][-1], places=4)


if __name__ == "__main__":
    unittest.main()
