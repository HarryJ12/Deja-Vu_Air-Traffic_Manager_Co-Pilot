from __future__ import annotations

import sys
import unittest
import os
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.config import discover_data_bundle
from app.core.dataset import DataBundle
from app.core.flight_interpolation import interpolate_flight
from app.core.geo import interpolate_route, weather_index
from app.core.schemas import MeetingRoomChatRequest
from app.core.time_bins import parse_iso
from app.services.chat_service import ChatService
from app.services.voice_service import VoiceService


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

    def test_meeting_room_chat_returns_spoken_conversation(self):
        os.environ["USE_MOCK_LLM"] = "true"
        root = discover_data_bundle()
        if root is None:
            self.skipTest("No data bundle available")
        bundle = DataBundle(root)
        scenario_id = bundle.scenario_ids()[0]
        time_bin_id = bundle.scenario_summary_meta(scenario_id)["initial_time_bin_id"]

        response = ChatService().meeting_room_chat(
            MeetingRoomChatRequest(
                scenario_id=scenario_id,
                time_bin_id=time_bin_id,
                message="Ask all agents what I should do next.",
            )
        )

        self.assertEqual(response.messages[0].role, "operator")
        spoken_agents = [message.agent for message in response.messages if message.role == "agent"]
        self.assertGreaterEqual(spoken_agents.count("Jarvis"), 2)
        for agent in ["Air Marshal", "Weather Boy", "Domino", "Historian"]:
            self.assertIn(agent, spoken_agents)
        for message in response.messages[1:]:
            self.assertIsNotNone(message.voice_id)

    def test_voice_service_reports_unplayable_mock_audio(self):
        previous = os.environ.get("USE_MOCK_VOICE")
        os.environ["USE_MOCK_VOICE"] = "true"
        try:
            response = VoiceService().synthesize("Test voice output.", agent="Jarvis")
        finally:
            if previous is None:
                os.environ.pop("USE_MOCK_VOICE", None)
            else:
                os.environ["USE_MOCK_VOICE"] = previous

        self.assertFalse(response.is_playable)
        self.assertIsNone(response.audio_base64)
        self.assertEqual(response.agent, "Jarvis")
        self.assertEqual(response.voice_id, "VtiJxTGG57AFTSQjMlja")
        self.assertEqual(response.error_code, "elevenlabs_unavailable")


if __name__ == "__main__":
    unittest.main()
