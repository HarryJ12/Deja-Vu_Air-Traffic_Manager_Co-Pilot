from __future__ import annotations

from app.core.schemas import AgentCard, AgentRosterResponse

from .voice_service import VoiceService


class AgentService:
    def __init__(self, voices: VoiceService | None = None):
        self.voices = voices or VoiceService()

    def roster(self) -> AgentRosterResponse:
        agents = [
            AgentCard(
                agent="Jarvis",
                role="Moderator",
                short_label="J",
                default_room="jarvis",
                can_speak_in_default=True,
                meeting_room_only=False,
                voice_id=self.voices.voice_id_for_agent("Jarvis"),
                default_position={"x": 0.72, "y": 0.1},
                responsibilities=["prioritize risks", "summarize agents", "present recommendations"],
            ),
            AgentCard(
                agent="Weather Boy",
                role="Weather impact",
                short_label="WX",
                default_room="meeting_room",
                can_speak_in_default=False,
                meeting_room_only=True,
                voice_id=self.voices.voice_id_for_agent("Weather Boy"),
                default_position={"x": 0.72, "y": 0.24},
                responsibilities=["storm intensity", "echo tops", "route-weather conflicts"],
            ),
            AgentCard(
                agent="Air Marshal",
                role="Sector capacity",
                short_label="AM",
                default_room="meeting_room",
                can_speak_in_default=False,
                meeting_room_only=True,
                voice_id=self.voices.voice_id_for_agent("Air Marshal"),
                default_position={"x": 0.72, "y": 0.38},
                responsibilities=["sector occupancy", "capacity risk", "contributing flights"],
            ),
            AgentCard(
                agent="Domino",
                role="Network impact",
                short_label="DM",
                default_room="meeting_room",
                can_speak_in_default=False,
                meeting_room_only=True,
                voice_id=self.voices.voice_id_for_agent("Domino"),
                default_position={"x": 0.72, "y": 0.52},
                responsibilities=["delay proxy", "downstream pressure", "arrival bank impact"],
            ),
            AgentCard(
                agent="Risko",
                role="Confidence guardrail",
                short_label="RK",
                default_room="meeting_room",
                can_speak_in_default=False,
                meeting_room_only=True,
                voice_id=self.voices.voice_id_for_agent("Risko"),
                default_position={"x": 0.72, "y": 0.66},
                responsibilities=["confidence drift", "data caveats", "divergence warnings"],
            ),
            AgentCard(
                agent="Historian",
                role="Precedent memory",
                short_label="H",
                default_room="meeting_room",
                can_speak_in_default=False,
                meeting_room_only=True,
                voice_id=self.voices.voice_id_for_agent("Historian"),
                default_position={"x": 0.72, "y": 0.8},
                responsibilities=["similar scenarios", "mock historical outcomes", "supporting evidence"],
            ),
        ]
        return AgentRosterResponse(
            agents=agents,
            note=(
                "Jarvis is the only default-mode speaker. Specialist agents are draggable meeting-room "
                "participants and can speak directly only inside the meeting room."
            ),
        )
