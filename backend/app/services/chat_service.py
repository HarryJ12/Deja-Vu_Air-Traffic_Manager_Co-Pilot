from __future__ import annotations

from app.core.schemas import ChatMessage, ChatResponse, ChatRequest, MeetingRoomChatRequest

from .briefing_service import BriefingService
from .voice_service import VoiceService


class ChatService:
    def __init__(self, briefings: BriefingService | None = None, voices: VoiceService | None = None):
        self.briefings = briefings or BriefingService()
        self.voices = voices or VoiceService()

    def jarvis_chat(self, request: ChatRequest) -> ChatResponse:
        briefing = self.briefings.briefing(request.scenario_id, request.time_bin_id)
        content = f"{briefing.headline} {briefing.summary}"
        return ChatResponse(
            room="jarvis",
            messages=[
                ChatMessage(
                    role="agent",
                    agent="Jarvis",
                    content=content,
                    severity="alert" if briefing.primary_risk and briefing.primary_risk.risk_score >= 90 else "watch",
                    voice_id=self.voices.voice_id_for_agent("Jarvis"),
                    source="jarvis_direct",
                )
            ],
            briefing=briefing,
            note="Default chat is Jarvis-only. Enter the meeting room to speak directly with specialist agents.",
        )

    def meeting_room_chat(self, request: MeetingRoomChatRequest) -> ChatResponse:
        briefing = self.briefings.briefing(request.scenario_id, request.time_bin_id)
        requested = request.requested_agents or [
            "Jarvis",
            "Weather Boy",
            "Air Marshal",
            "Domino",
            "Historian",
            "Auditor",
        ]
        messages: list[ChatMessage] = []

        if "Jarvis" in requested:
            messages.append(
                ChatMessage(
                    role="agent",
                    agent="Jarvis",
                    content=f"Meeting room opened. {briefing.headline}",
                    severity="watch" if briefing.primary_risk else "info",
                    voice_id=self.voices.voice_id_for_agent("Jarvis"),
                    source="moderator",
                )
            )

        findings = {finding.agent: finding for finding in briefing.agents}
        for agent in requested:
            if agent == "Jarvis":
                continue
            finding = findings.get(agent)
            if finding is None:
                continue
            messages.append(
                ChatMessage(
                    role="agent",
                    agent=agent,
                    content=f"{finding.title}. {finding.detail}",
                    severity=finding.severity,
                    voice_id=self.voices.voice_id_for_agent(agent),
                    source="agent_finding",
                )
            )

        return ChatResponse(
            room="meeting_room",
            messages=messages,
            briefing=briefing,
            note="Meeting room mode allows direct multi-agent discussion and agent-specific ElevenLabs voices.",
        )
