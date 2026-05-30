# DĒJÅ VŪ Intelligence — Project Memory

Airspace comprehension layer for traffic flow managers (ASI hackathon).
Single-screen operational console. The human stays in control.

## Source of truth (read these)
- Technical contract, stack, API, file structure, anti-vibe rules: @scaffolding.md
- Product spec, agents, thesis, demo flow: @plan.md
- Frontend build guide: @frontend/frontend.md

## Non-negotiables
- Red / black / white only. No gradients, no glow, no rainbow, no emoji in UI.
- Never claim data the bundle lacks (no aircraft type, heading, ARTCC, winds — see plan.md "Missing From Bundle").
- Every recommendation must be explainable from bundle fields or clearly-labeled heuristics.
- Frontend builds mock-first against `shared/sample-responses/`, then swaps to the real API.

## Raw data
- Bundle lives outside git at `data_extracted/hackathon_data_bundle/` (also `hackathon_data_bundle.zip`). Never commit the raw bundle.
- 11 scenario snapshots (`asked_at_*Z/routes.json`), `sectors.geojson`, weather `wx/refc` + `wx/retop` `.npz`.
