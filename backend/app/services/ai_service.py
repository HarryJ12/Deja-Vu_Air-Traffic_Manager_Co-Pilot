from __future__ import annotations

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

        try:
            from anthropic import Anthropic
        except Exception:
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
            client = Anthropic(api_key=self.settings.anthropic_api_key)
            response = client.messages.create(
                model="claude-3-5-sonnet-latest",
                max_tokens=160,
                temperature=0.2,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.content[0].text.strip()
            return text or summary
        except Exception:
            return summary
