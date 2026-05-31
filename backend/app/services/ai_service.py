from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from app.config import get_settings
from app.core.schemas import AgentFinding, RecommendationCard, RiskSummary


class ClaudeProviderError(RuntimeError):
    pass


ROOM_PROVIDER_BY_AGENT = {
    "Jarvis": "openai",
    "Air Marshal": "openai",
    "Weather Boy": "openai",
    "Domino": "grok",
    "Risko": "grok",
    "Historian": "openai",
}


AGENT_SPECIALTIES = {
    "Jarvis": "moderates, routes the question, and gives the final next step",
    "Air Marshal": "explains airspace crowding and capacity",
    "Weather Boy": "explains storm intensity, storm height, and weather conflicts",
    "Domino": "explains downstream delay and network ripple effects",
    "Risko": "explains confidence, caveats, and what could break the plan",
    "Historian": "explains similar past bundled cases and precedent",
}


class ClaudeBriefingService:
    """Optional Claude copy layer.

    The deterministic backend always produces the operational facts. Claude is
    only used to compress those facts into a crisp operator-facing brief.
    """

    def __init__(self):
        self.settings = get_settings()

    @property
    def demo_style(self) -> str:
        return (
            "Audience: software engineers and hackathon judges, not air traffic controllers. "
            "Explain the operational idea in plain language. Avoid unexplained ATC shorthand. "
            "When using a sector id like HIGH_142, call it an airspace region. "
            "When using dBZ or echo tops, explain it as storm intensity or storm height. "
            "Default to one sentence. Hard cap every spoken turn at two short sentences. "
            "No JSON, markdown, bullets, emojis, or em dashes in spoken content."
        )

    def render_summary(
        self,
        headline: str,
        summary: str,
        primary_risk: RiskSummary | None,
        agents: list[AgentFinding],
        recommendations: list[RecommendationCard],
    ) -> str:
        self.settings = get_settings()
        if not self.settings.has_anthropic:
            return self._compact_spoken(summary, max_chars=190)

        payload = {
            "headline": headline,
            "deterministic_summary": summary,
            "primary_risk": self._risk_payload(primary_risk),
            "agents": self._agent_payloads(agents),
            "recommendations": self._recommendation_payloads(recommendations),
        }
        prompt = (
            "Rewrite this air traffic flow-management briefing for a live demo. "
            "Use at most two short sentences. Keep it punchy. Do not invent data. "
            f"{self.demo_style} "
            f"Briefing facts: {payload}"
        )
        try:
            text = self._post_claude(prompt, max_tokens=70)
            return self._compact_spoken(text or summary, max_chars=190)
        except Exception:
            return summary

    def render_jarvis_response(
        self,
        operator_message: str,
        headline: str,
        summary: str,
        primary_risk: RiskSummary | None,
        agents: list[AgentFinding],
        recommendations: list[RecommendationCard],
    ) -> str:
        self.settings = get_settings()
        fallback = self._deterministic_jarvis_response(
            operator_message,
            headline,
            summary,
            primary_risk,
            recommendations,
        )
        if not self.settings.has_anthropic:
            return self._compact_spoken(fallback, max_chars=190)

        payload = {
            "operator_message": operator_message,
            "headline": headline,
            "deterministic_summary": summary,
            "primary_risk": self._risk_payload(primary_risk),
            "agents": self._agent_payloads(agents),
            "recommendations": self._recommendation_payloads(recommendations),
        }
        prompt = (
            "You are Jarvis, the default moderator for an air traffic decision demo. "
            "Answer the operator directly using only the supplied scenario facts. "
            "Keep it concise, clear, and grounded. Use at most two short sentences. "
            "Each sentence should fit on one UI line. "
            "If another specialist should answer, say which one and why. "
            "Do not mention that you are an AI model. "
            f"{self.demo_style} "
            f"Scenario facts: {payload}"
        )
        try:
            return self._compact_spoken(
                self._post_claude(prompt, max_tokens=80) or fallback,
                max_chars=190,
            )
        except ClaudeProviderError:
            raise

    def render_agent_response(
        self,
        agent_name: str,
        operator_message: str,
        headline: str,
        summary: str,
        primary_risk: RiskSummary | None,
        finding: AgentFinding | None,
        recommendations: list[RecommendationCard],
    ) -> str:
        self.settings = get_settings()
        fallback = self._deterministic_agent_response(
            agent_name,
            operator_message,
            primary_risk,
            finding,
            recommendations,
        )
        provider = self._provider_for_agent(agent_name)
        if provider is None:
            return self._compact_spoken(fallback, max_chars=180)

        payload = {
            "agent": agent_name,
            "operator_message": operator_message,
            "headline": headline,
            "deterministic_summary": summary,
            "primary_risk": self._risk_payload(primary_risk),
            "agent_finding": self._agent_payload(finding) if finding else None,
            "recommendations": self._recommendation_payloads(recommendations),
        }
        prompt = (
            f"You are {agent_name}, a specialist agent in an air traffic decision demo. "
            "Answer only from your specialty and the supplied facts. "
            "Stay concise and explain the tradeoff for a non-controller. Use at most two short sentences. "
            "Each sentence should fit on one UI line. "
            "If another agent is better suited, name that agent and say what they should check. "
            "Do not invent data. "
            f"{self.demo_style} "
            "Specialties: Weather Boy covers convective weather and echo tops. "
            "Air Marshal covers sector capacity and constrained flights. "
            "Domino covers network delay and downstream impact. "
            "Risko covers confidence, uncertainty, and divergence warnings. "
            "Historian covers similar past bundled scenarios and mock precedent. "
            f"Scenario facts: {payload}"
        )
        try:
            return self._compact_spoken(
                self._post_chat(provider, prompt, max_tokens=70) or fallback,
                max_chars=180,
            )
        except ClaudeProviderError:
            raise

    def render_meeting_room_turn(
        self,
        operator_message: str,
        fallback_messages: list[dict[str, str]],
        headline: str,
        summary: str,
        primary_risk: RiskSummary | None,
        agents: list[AgentFinding],
        recommendations: list[RecommendationCard],
        history: list[dict[str, str]] | None = None,
    ) -> list[dict[str, str]]:
        self.settings = get_settings()
        if not self._has_any_chat_provider():
            return self._compact_fallback_turns(fallback_messages)

        payload = {
            "operator_message": operator_message,
            "headline": headline,
            "deterministic_summary": summary,
            "primary_risk": self._risk_payload(primary_risk),
            "agents": self._agent_payloads(agents),
            "recommendations": self._recommendation_payloads(recommendations),
            "recent_history": (history or [])[-6:],
        }

        rendered: list[dict[str, str]] = self._compact_fallback_turns(fallback_messages)

        def render_one(index: int, turn: dict[str, str]) -> tuple[int, dict[str, str]]:
            return index, self._render_room_agent_turn(turn, payload)

        with ThreadPoolExecutor(max_workers=min(6, len(fallback_messages))) as executor:
            futures = [
                executor.submit(render_one, index, turn)
                for index, turn in enumerate(fallback_messages)
            ]
            for future in as_completed(futures):
                try:
                    index, turn = future.result()
                    if turn.get("content"):
                        rendered[index] = turn
                except Exception:
                    continue
        return rendered

    def _deterministic_jarvis_response(
        self,
        operator_message: str,
        headline: str,
        summary: str,
        primary_risk: RiskSummary | None,
        recommendations: list[RecommendationCard],
    ) -> str:
        top_action = recommendations[0].summary if recommendations else "Keep monitoring the selected time bin."
        if primary_risk is None:
            return f"{headline} {summary} {top_action}"
        return (
            f"{headline} In plain English, the airspace region {primary_risk.sector_id} is getting too crowded, "
            f"with {primary_risk.affected_flight_count} flights tied to the problem. {top_action}"
        )

    def _deterministic_agent_response(
        self,
        agent_name: str,
        operator_message: str,
        primary_risk: RiskSummary | None,
        finding: AgentFinding | None,
        recommendations: list[RecommendationCard],
    ) -> str:
        if finding is None:
            return "I do not have a specific finding for this time bin."

        action = recommendations[0].summary if recommendations else "Keep the current monitor posture."
        question = operator_message.strip().replace("\n", " ")
        if len(question) > 90:
            question = f"{question[:87]}..."
        question_clause = f"On '{question}', " if question else ""
        if agent_name == "Historian":
            return (
                f"{question_clause}I am matching the current shape against prior bundled scenarios. "
                f"{finding.title}. {finding.detail}"
            )
        if agent_name == "Domino":
            delay = primary_risk.projected_delay_minutes if primary_risk else 0
            return (
                f"{question_clause}my concern is the chain reaction after this local problem. "
                f"{finding.title}. The current delay estimate is {delay} minutes across the network, so I would test whether the fix creates a new backup somewhere else."
            )
        if agent_name == "Risko":
            return (
                f"{question_clause}I am checking whether the evidence is strong enough to trust. "
                f"{finding.title}. Keep the plan reversible if the next forecast slice stops matching past cases."
            )
        if agent_name == "Air Marshal":
            sector = primary_risk.sector_id if primary_risk else "the active sector set"
            return (
                f"{question_clause}I am watching how crowded each airspace region is. "
                f"{finding.title}. Keep the map focused on {sector} before approving any flow change."
            )
        if agent_name == "Weather Boy":
            return (
                f"{question_clause}weather is the constraint I can validate. "
                f"{finding.title}. If the storm stays intense and high enough to intersect cruising aircraft, the route preview is worth opening."
            )
        return f"{question_clause}{finding.title}. {finding.detail} {action}"

    def _compact_spoken(
        self,
        text: str,
        max_chars: int = 180,
        max_sentences: int = 2,
        ellipsis: bool = True,
    ) -> str:
        clean = " ".join(text.replace("\n", " ").split())
        clean = clean.strip("\"' ")
        if not clean:
            return clean

        sentences = re.split(r"(?<=[.!?])\s+", clean)
        compact = " ".join(sentences[:max_sentences]).strip()
        if len(compact) <= max_chars:
            return compact

        truncated = compact[:max_chars].rsplit(" ", 1)[0].rstrip(" ,;:")
        if not truncated:
            truncated = compact[:max_chars].rstrip()
        return f"{truncated}..." if ellipsis else truncated

    def _compact_fallback_turns(self, turns: list[dict[str, str]]) -> list[dict[str, str]]:
        return [
            {
                **turn,
                "content": self._compact_spoken(
                    turn.get("content", ""),
                    max_chars=85,
                    ellipsis=False,
                ),
                "source": turn.get("source", "fallback_room"),
            }
            for turn in turns
        ]

    def _render_room_agent_turn(
        self,
        turn: dict[str, str],
        payload: dict[str, Any],
    ) -> dict[str, str]:
        agent = turn.get("agent", "Jarvis")
        provider = self._provider_for_agent(agent)
        if provider is None:
            return {
                **turn,
                "content": self._compact_spoken(
                    turn.get("content", ""),
                    max_chars=85,
                    ellipsis=False,
                ),
                "source": "fallback_room",
            }

        prompt = self._room_agent_prompt(agent, turn, payload)
        try:
            raw = self._post_chat(provider, prompt, max_tokens=45)
        except ClaudeProviderError:
            return {
                **turn,
                "content": self._compact_spoken(
                    turn.get("content", ""),
                    max_chars=85,
                    ellipsis=False,
                ),
                "source": f"{provider}_fallback",
            }
        content = self._single_spoken_line(raw)
        if not content:
            content = turn.get("content", "")
        return {
            **turn,
            "content": self._compact_spoken(content, max_chars=85, ellipsis=False),
            "source": f"{provider}_room",
        }

    def _room_agent_prompt(
        self,
        agent: str,
        turn: dict[str, str],
        payload: dict[str, Any],
    ) -> str:
        source = turn.get("source", "")
        if agent == "Jarvis" and source == "moderator_open":
            job = "Open the roundtable and route the question to the right specialists."
        elif agent == "Jarvis" and source == "moderator_synthesis":
            job = "Close with the best next step."
        else:
            job = f"Give the {AGENT_SPECIALTIES.get(agent, 'specialist')} read."
        agent_fact = next(
            (item for item in payload.get("agents", []) if item.get("agent") == agent),
            None,
        )
        compact_payload = {
            "operator_message": payload.get("operator_message"),
            "primary_risk": payload.get("primary_risk"),
            "your_finding": agent_fact,
            "recommendations": payload.get("recommendations", [])[:2],
            "fallback_intent": turn.get("content", ""),
        }
        return (
            f"You are {agent} in a live aviation decision demo. {job} "
            "The audience is software engineers, not air traffic controllers. "
            "Use plain English and only the supplied facts. "
            "Reply with one complete sentence under 70 characters. "
            "No agent name, JSON, markdown, bullets, emojis, or em dashes. "
            "If the user asks only about weather, non-weather agents should give a quick handoff or implication. "
            f"Facts: {compact_payload}"
        )

    def _single_spoken_line(self, raw: str) -> str:
        text = " ".join(raw.replace("\n", " ").split()).strip("\"' ")
        text = re.sub(
            r"^(Jarvis|Air Marshal|Weather Boy|Domino|Risko|Historian)\s*:\s*",
            "",
            text,
            flags=re.IGNORECASE,
        )
        return text

    def _has_any_chat_provider(self) -> bool:
        return (
            self.settings.has_anthropic
            or self.settings.has_openai_chat
            or self.settings.has_xai
        )

    def _provider_for_agent(self, agent: str) -> str | None:
        desired = ROOM_PROVIDER_BY_AGENT.get(agent, "claude")
        for provider in [desired, "openai", "grok", "claude"]:
            if provider == "claude" and self.settings.has_anthropic:
                return provider
            if provider == "openai" and self.settings.has_openai_chat:
                return provider
            if provider == "grok" and self.settings.has_xai:
                return provider
        return None

    def _risk_payload(self, risk: RiskSummary | None) -> dict[str, Any] | None:
        if risk is None:
            return None
        return {
            "airspace_region": risk.sector_id,
            "altitude_layer": risk.altitude_band,
            "peak_time": risk.peak_time,
            "risk_score": risk.risk_score,
            "percent_of_normal_limit": risk.utilization_pct,
            "affected_flights": risk.affected_flight_count,
            "estimated_network_delay_minutes": risk.projected_delay_minutes,
            "causes": risk.causes[:3],
        }

    def _agent_payload(self, agent: AgentFinding) -> dict[str, Any]:
        return {
            "agent": agent.agent,
            "severity": agent.severity,
            "title": agent.title,
            "detail": agent.detail,
            "evidence": agent.evidence[:2],
        }

    def _agent_payloads(self, agents: list[AgentFinding]) -> list[dict[str, Any]]:
        return [self._agent_payload(agent) for agent in agents]

    def _recommendation_payloads(
        self,
        recommendations: list[RecommendationCard],
    ) -> list[dict[str, Any]]:
        return [
            {
                "id": rec.id,
                "title": rec.title,
                "summary": rec.summary,
                "expected_impact": rec.expected_impact,
                "confidence_pct": rec.confidence_pct,
                "agent_contributors": rec.agent_contributors,
                "risks": rec.risks[:2],
            }
            for rec in recommendations[:3]
        ]

    def _merge_meeting_room_json(
        self,
        raw: str,
        fallback_messages: list[dict[str, str]],
    ) -> list[dict[str, str]]:
        try:
            parsed: Any = json.loads(self._json_object_text(raw))
        except json.JSONDecodeError as exc:
            raise ClaudeProviderError("Anthropic returned invalid meeting-room JSON.") from exc
        raw_messages = parsed.get("messages") if isinstance(parsed, dict) else None
        if not isinstance(raw_messages, list):
            raise ClaudeProviderError("Anthropic meeting-room response did not include messages.")

        merged = [dict(item) for item in fallback_messages]
        replaced = 0
        for index, fallback in enumerate(fallback_messages):
            if index >= len(raw_messages):
                break
            candidate = raw_messages[index]
            if not isinstance(candidate, dict):
                continue
            if candidate.get("agent") != fallback["agent"]:
                continue
            content = str(candidate.get("content", "")).strip()
            if content:
                merged[index]["content"] = self._compact_spoken(content, max_chars=180)
                merged[index]["source"] = "claude_room"
                replaced += 1
        if replaced != len(fallback_messages):
            raise ClaudeProviderError("Anthropic meeting-room response missed one or more agent turns.")
        return merged

    def _json_object_text(self, raw: str) -> str:
        text = raw.strip()
        if text.startswith("```"):
            text = text.strip("`").strip()
            if text.lower().startswith("json"):
                text = text[4:].strip()
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            return text[start : end + 1]
        return text

    def _merge_meeting_room_lines(
        self,
        raw: str,
        fallback_messages: list[dict[str, str]],
    ) -> list[dict[str, str]]:
        candidates = self._meeting_room_line_candidates(raw)
        merged = [dict(item) for item in fallback_messages]
        line_index = 0
        replaced = 0

        for index, fallback in enumerate(fallback_messages):
            expected_agent = fallback["agent"]
            while line_index < len(candidates):
                content = self._agent_line_content(candidates[line_index], expected_agent)
                line_index += 1
                if not content:
                    continue
                merged[index]["content"] = self._compact_spoken(content, max_chars=95)
                merged[index]["source"] = "claude_room"
                replaced += 1
                break

        if replaced != len(fallback_messages):
            raise ClaudeProviderError("Anthropic meeting-room response missed one or more agent turns.")
        return merged

    def _meeting_room_line_candidates(self, raw: str) -> list[str]:
        text = raw.strip()
        if text.startswith("```"):
            text = text.strip("`").strip()
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        if len(lines) > 1:
            return lines

        agents = ("Jarvis", "Air Marshal", "Weather Boy", "Domino", "Risko", "Historian")
        pattern = r"(?=(?:Jarvis|Air Marshal|Weather Boy|Domino|Risko|Historian)\s*:)"
        chunks = [chunk.strip() for chunk in re.split(pattern, text) if chunk.strip()]
        if chunks:
            return chunks
        return [text] if text else []

    def _agent_line_content(self, line: str, agent: str) -> str | None:
        pattern = rf"^(?:[-*]\s*)?(?:\d+[.)]\s*)?\**\s*{re.escape(agent)}\s*\**\s*:\s*(.+)$"
        match = re.match(pattern, line, flags=re.IGNORECASE)
        if not match:
            return None
        return match.group(1).strip()

    def _post_claude(self, prompt: str, max_tokens: int, timeout: int = 30) -> str:
        self.settings = get_settings()
        body = json.dumps(
            {
                "model": self.settings.anthropic_model,
                "max_tokens": max_tokens,
                "temperature": 0.2,
                "messages": [{"role": "user", "content": prompt}],
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=body,
            method="POST",
            headers={
                "x-api-key": self.settings.anthropic_api_key or "",
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace").strip()
            raise ClaudeProviderError(
                f"Anthropic request failed with HTTP {exc.code}: {body[:300]}"
            ) from exc
        except Exception as exc:
            raise ClaudeProviderError(f"Anthropic request failed: {exc}") from exc
        content = payload.get("content", [])
        if not content:
            return ""
        first = content[0]
        if isinstance(first, dict):
            return str(first.get("text", "")).strip()
        return ""

    def _post_chat(self, provider: str, prompt: str, max_tokens: int) -> str:
        if provider == "claude":
            return self._post_claude(prompt, max_tokens=max_tokens, timeout=6)
        if provider == "openai":
            return self._post_openai_compatible(
                url="https://api.openai.com/v1/chat/completions",
                api_key=self.settings.openai_api_key or "",
                model=self.settings.openai_chat_model,
                prompt=prompt,
                max_tokens=max_tokens,
                provider_name="OpenAI",
                timeout=8,
            )
        if provider == "grok":
            return self._post_openai_compatible(
                url="https://api.x.ai/v1/chat/completions",
                api_key=self.settings.xai_api_key or "",
                model=self.settings.xai_model,
                prompt=prompt,
                max_tokens=max_tokens,
                provider_name="Grok",
                timeout=8,
            )
        raise ClaudeProviderError(f"Unknown chat provider: {provider}")

    def _post_openai_compatible(
        self,
        url: str,
        api_key: str,
        model: str,
        prompt: str,
        max_tokens: int,
        provider_name: str,
        timeout: int,
    ) -> str:
        body = json.dumps(
            {
                "model": model,
                "messages": [
                    {
                        "role": "system",
                        "content": "You write concise spoken UI responses for a live demo.",
                    },
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.2,
                "max_tokens": max_tokens,
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace").strip()
            raise ClaudeProviderError(
                f"{provider_name} request failed with HTTP {exc.code}: {body[:300]}"
            ) from exc
        except Exception as exc:
            raise ClaudeProviderError(f"{provider_name} request failed: {exc}") from exc

        choices = payload.get("choices", [])
        if not choices:
            return ""
        message = choices[0].get("message") if isinstance(choices[0], dict) else None
        if isinstance(message, dict):
            return str(message.get("content", "")).strip()
        return ""
