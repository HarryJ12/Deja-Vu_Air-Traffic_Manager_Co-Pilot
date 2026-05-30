from __future__ import annotations

import json
import urllib.request

from app.config import get_settings
from app.core.schemas import AgentFinding, RecommendationCard, RiskSummary


class ClaudeBriefingService:
    """Optional Claude copy layer.

    The deterministic backend always produces the operational facts. Claude is
    only used to compress those facts into a crisp operator-facing brief.
    """

    def __init__(self):
        self.settings = get_settings()

    def render_summary(
        self,
        headline: str,
        summary: str,
        primary_risk: RiskSummary | None,
        agents: list[AgentFinding],
        recommendations: list[RecommendationCard],
    ) -> str:
        if not self.settings.has_anthropic:
            return summary

        risk_context = primary_risk.model_dump() if primary_risk else None
        payload = {
            "headline": headline,
            "deterministic_summary": summary,
            "primary_risk": risk_context,
            "agents": [agent.model_dump() for agent in agents],
            "recommendations": [rec.model_dump() for rec in recommendations],
        }
        prompt = (
            "Rewrite this air traffic flow-management briefing for a busy operator. "
            "Use 3 short sentences maximum. No emojis. No em dashes. Do not invent data. "
            f"Briefing facts: {payload}"
        )
        try:
            text = self._post_claude(prompt, max_tokens=160)
            return text or summary
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
        fallback = self._deterministic_jarvis_response(
            operator_message,
            headline,
            summary,
            primary_risk,
            recommendations,
        )
        if not self.settings.has_anthropic:
            return fallback

        payload = {
            "operator_message": operator_message,
            "headline": headline,
            "deterministic_summary": summary,
            "primary_risk": primary_risk.model_dump() if primary_risk else None,
            "agents": [agent.model_dump() for agent in agents],
            "recommendations": [rec.model_dump() for rec in recommendations],
        }
        prompt = (
            "You are Jarvis, the default moderator for an air traffic control decision support console. "
            "Answer the operator directly using only the supplied scenario facts. "
            "Keep it operational, concise, and grounded. Use 4 short sentences maximum. "
            "No emojis. No em dashes. Do not mention that you are an AI model. "
            f"Scenario facts: {payload}"
        )
        try:
            return self._post_claude(prompt, max_tokens=220) or fallback
        except Exception:
            return fallback

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
            f"{headline} The controlling issue is {primary_risk.sector_id} at "
            f"{primary_risk.utilization_pct:.0f}% utilization with "
            f"{primary_risk.affected_flight_count} affected flights. {top_action}"
        )

    def _post_claude(self, prompt: str, max_tokens: int) -> str:
        body = json.dumps(
            {
                "model": "claude-3-5-sonnet-latest",
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
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
        content = payload.get("content", [])
        if not content:
            return ""
        first = content[0]
        if isinstance(first, dict):
            return str(first.get("text", "")).strip()
        return ""
