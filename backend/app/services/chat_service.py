from __future__ import annotations

from app.core.schemas import ChatMessage, ChatResponse, ChatRequest, MeetingRoomChatRequest

from .briefing_service import BriefingService
from .ai_service import ClaudeBriefingService
from .voice_service import VoiceService


AGENT_ORDER = ("Jarvis", "Air Marshal", "Weather Boy", "Domino", "Risko", "Historian")
SPECIALIST_ORDER = ("Air Marshal", "Weather Boy", "Domino", "Risko", "Historian")


class ChatService:
    def __init__(self, briefings: BriefingService | None = None, voices: VoiceService | None = None):
        self.briefings = briefings or BriefingService()
        self.voices = voices or VoiceService()
        self.claude = ClaudeBriefingService()

    def jarvis_chat(self, request: ChatRequest) -> ChatResponse:
        briefing = self.briefings.briefing(request.scenario_id, request.time_bin_id, ai_summary=False)
        content = self.claude.render_jarvis_response(
            request.message,
            briefing.headline,
            briefing.summary,
            briefing.primary_risk,
            briefing.agents,
            briefing.recommendations,
        )
        return ChatResponse(
            room="jarvis",
            messages=[
                ChatMessage(
                    role="operator",
                    agent=None,
                    content=request.message,
                    severity="info",
                    voice_id=None,
                    source="operator_voice",
                ),
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
        briefing = self.briefings.briefing(request.scenario_id, request.time_bin_id, ai_summary=False)
        requested = self._normalize_requested(request.requested_agents)
        if request.requested_agents and len(requested) == 1:
            return self._solo_agent_chat(request, briefing, requested[0])

        fallback_turns = self._fallback_meeting_turns(request.message, briefing, requested)
        rendered_turns = self.claude.render_meeting_room_turn(
            request.message,
            fallback_turns,
            briefing.headline,
            briefing.summary,
            briefing.primary_risk,
            briefing.agents,
            briefing.recommendations,
            self._history_payload(request.history),
        )

        messages: list[ChatMessage] = []
        messages.append(
            ChatMessage(
                role="operator",
                agent=None,
                content=request.message,
                severity="info",
                voice_id=None,
                source="operator_voice",
            )
        )

        findings = {finding.agent: finding for finding in briefing.agents}
        for turn in rendered_turns:
            agent = turn.get("agent")
            content = turn.get("content", "").strip()
            if agent not in AGENT_ORDER or not content:
                continue
            finding = findings.get(agent)
            messages.append(
                ChatMessage(
                    role="agent",
                    agent=agent,
                    content=content,
                    severity=finding.severity if finding else self._jarvis_severity(briefing),
                    voice_id=self.voices.voice_id_for_agent(agent),
                    source=turn.get("source", "claude_room"),
                )
            )

        return ChatResponse(
            room="meeting_room",
            messages=messages,
            briefing=briefing,
            note="Meeting room mode allows direct multi-agent discussion and agent-specific ElevenLabs voices.",
        )

    def _solo_agent_chat(self, request: MeetingRoomChatRequest, briefing, agent: str) -> ChatResponse:
        findings = {finding.agent: finding for finding in briefing.agents}
        if agent == "Jarvis":
            content = self.claude.render_jarvis_response(
                request.message,
                briefing.headline,
                briefing.summary,
                briefing.primary_risk,
                briefing.agents,
                briefing.recommendations,
            )
            finding = None
        else:
            finding = findings.get(agent)
            content = self.claude.render_agent_response(
                agent,
                request.message,
                briefing.headline,
                briefing.summary,
                briefing.primary_risk,
                finding,
                briefing.recommendations,
            )

        return ChatResponse(
            room="meeting_room",
            messages=[
                ChatMessage(
                    role="operator",
                    agent=None,
                    content=request.message,
                    severity="info",
                    voice_id=None,
                    source="operator_voice",
                ),
                ChatMessage(
                    role="agent",
                    agent=agent,
                    content=content,
                    severity=finding.severity if finding else self._jarvis_severity(briefing),
                    voice_id=self.voices.voice_id_for_agent(agent),
                    source="agent_claude_solo",
                ),
            ],
            briefing=briefing,
            note=f"{agent} answered directly with the live LLM prompt for that specialist.",
        )

    def _normalize_requested(self, requested: list[str] | None) -> list[str]:
        if not requested:
            return list(AGENT_ORDER)
        normalized = [agent for agent in AGENT_ORDER if agent in requested]
        return normalized or ["Jarvis"]

    def _fast_room_agents(self, message: str) -> list[str]:
        clean = message.lower()
        if any(word in clean for word in ["all agents", "everyone", "everybody", "roundtable", "debate"]):
            return list(AGENT_ORDER)

        specialists: list[str] = []
        if any(word in clean for word in ["weather", "storm", "rain", "dbz", "echo", "cell"]):
            specialists.append("Weather Boy")
        if any(word in clean for word in ["capacity", "crowd", "sector", "airspace", "planes", "traffic"]):
            specialists.append("Air Marshal")
        if any(word in clean for word in ["delay", "network", "downstream", "ripple", "domino"]):
            specialists.append("Domino")
        if any(word in clean for word in ["risk", "confidence", "sure", "uncertain", "break", "trust"]):
            specialists.append("Risko")
        if any(word in clean for word in ["history", "historian", "past", "precedent", "similar"]):
            specialists.append("Historian")

        if not specialists:
            specialists = ["Weather Boy", "Air Marshal", "Domino"]
        if "Risko" not in specialists and len(specialists) < 3:
            specialists.append("Risko")
        return ["Jarvis", *specialists[:3]]

    def _history_payload(self, history: list[ChatMessage] | None) -> list[dict[str, str]]:
        if not history:
            return []
        return [
            {
                "role": item.role,
                "agent": item.agent or "operator",
                "content": item.content,
            }
            for item in history[-12:]
        ]

    def _fallback_meeting_turns(self, operator_message: str, briefing, requested: list[str]) -> list[dict[str, str]]:
        findings = {finding.agent: finding for finding in briefing.agents}
        room_agents = requested if requested != list(AGENT_ORDER) else self._fast_room_agents(operator_message)
        specialists = [agent for agent in SPECIALIST_ORDER if agent in room_agents]
        include_jarvis = "Jarvis" in room_agents
        turns: list[dict[str, str]] = []

        if include_jarvis:
            if specialists:
                turns.append(
                    {
                        "agent": "Jarvis",
                        "content": (
                            f"I heard {self._short_question(operator_message)} "
                            f"I will get quick reads from {', '.join(specialists)}."
                        ),
                        "source": "moderator_open",
                    }
                )
            else:
                turns.append(
                    {
                        "agent": "Jarvis",
                        "content": self.claude.render_jarvis_response(
                            operator_message,
                            briefing.headline,
                            briefing.summary,
                            briefing.primary_risk,
                            briefing.agents,
                            briefing.recommendations,
                        ),
                        "source": "jarvis_meeting_direct",
                    }
                )

        for agent in specialists:
            turns.append(
                {
                    "agent": agent,
                    "content": self._specialist_fallback(agent, operator_message, briefing, findings.get(agent)),
                    "source": "agent_conversation",
                }
                )

        if include_jarvis and specialists:
            action = (
                briefing.recommendations[0].summary
                if briefing.recommendations
                else "Keep monitoring until a recommendation clears confidence."
            )
            turns.append(
                {
                    "agent": "Jarvis",
                    "content": f"Consensus: preview this move next. {action}",
                    "source": "moderator_synthesis",
                }
            )

        return turns

    def _specialist_fallback(self, agent: str, operator_message: str, briefing, finding) -> str:
        if finding is None:
            return "I do not have a specific finding for this selected time bin."

        primary = briefing.primary_risk
        if agent == "Air Marshal":
            if primary:
                return (
                    f"Capacity: {primary.sector_id} is at {primary.utilization_pct:.0f}% "
                    f"with {primary.affected_flight_count} flights tied to the risk."
                )
            return "Capacity: no airspace region is above the watch threshold."
        if agent == "Weather Boy":
            return "Weather: I am checking whether storms are intense and tall enough to block planned routes."
        if agent == "Domino":
            delay = primary.projected_delay_minutes if primary else 0
            return f"Network: this choice is tied to about {delay} minutes of downstream delay."
        if agent == "Risko":
            return "Confidence: I am checking whether the recommendation stays valid if the storm shifts."
        if agent == "Historian":
            return "History: I am matching this moment against similar bundled past cases."
        return f"{finding.title}. {finding.detail}"

    def _jarvis_severity(self, briefing) -> str:
        if briefing.primary_risk and briefing.primary_risk.risk_score >= 90:
            return "alert"
        return "watch" if briefing.primary_risk else "info"

    def _short_question(self, message: str) -> str:
        clean = " ".join(message.strip().split())
        if len(clean) <= 120:
            return f'"{clean}".'
        return f'"{clean[:117]}...".'

    def _clip(self, message: str, limit: int) -> str:
        clean = " ".join(message.strip().split())
        if len(clean) <= limit:
            return clean
        return f"{clean[: limit - 3].rstrip()}..."
