# Airspace Comprehension Layer Scaffolding

This file defines the project structure, backend outputs, frontend inputs, and integration rules for the hackathon build.

The goal is to let frontend and backend work independently, then integrate through a stable API contract.

## Recommended Stack

Backend:

- Python
- FastAPI
- Pydantic
- NumPy
- Shapely
- Optional: GeoPandas only if setup is painless

Frontend:

- Next.js or Vite React
- TypeScript
- MapLibre GL or deck.gl for maps
- Recharts or lightweight SVG for charts
- Zustand or React context for scenario/time state

Data:

- Read directly from `/Users/hjoshi/Downloads/hackathon_data_bundle`
- Cache derived JSON in the repo under `data/cache/`
- Do not commit the full raw bundle

## Repo File Structure

```text
ASI_Hack/
  README.md
  plan.md
  scaffolding.md

  backend/
    README.md
    pyproject.toml
    app/
      main.py
      config.py
      api/
        scenarios.py
        briefings.py
        sectors.py
        weather.py
        actions.py
      core/
        dataset.py
        schemas.py
        time_bins.py
        geo.py
        flight_interpolation.py
        sector_occupancy.py
        weather_conflicts.py
        risk_scoring.py
        recommendations.py
        historian.py
        auditor.py
      services/
        scenario_service.py
        briefing_service.py
        action_preview_service.py
      cache/
        cache_writer.py
        cache_reader.py
      tests/
        test_dataset.py
        test_flight_interpolation.py
        test_sector_occupancy.py
        test_weather_conflicts.py

  frontend/
    README.md
    package.json
    src/
      app/
        page.tsx
        layout.tsx
      lib/
        api.ts
        types.ts
        format.ts
        time.ts
      state/
        scenario-store.ts
      components/
        AppShell.tsx
        TopBar.tsx
        ScenarioSelector.tsx
        TimeWarpSlider.tsx
        TacticalMap.tsx
        LayerControls.tsx
        SituationBrief.tsx
        AgentPanel.tsx
        RiskQueue.tsx
        ActionCards.tsx
        FlightList.tsx
        ConfidenceBar.tsx
        Skeletons.tsx
      styles/
        tokens.css
        globals.css

  shared/
    api-contract.md
    sample-responses/
      scenarios.json
      scenario-summary.json
      briefing.json
      action-preview.json

  data/
    cache/
      .gitkeep
```

## Raw Dataset Location

Default path:

```text
/Users/hjoshi/Downloads/hackathon_data_bundle
```

Backend config should support override:

```text
HACKATHON_DATA_BUNDLE=/path/to/hackathon_data_bundle
```

The raw bundle contains:

```text
documentation/
sectors.geojson
asked_at_2025-05-29T21:00:00Z/
asked_at_2025-06-10T17:00:00Z/
asked_at_2025-07-01T21:30:00Z/
asked_at_2025-07-08T22:00:00Z/
asked_at_2025-07-14T22:35:00Z/
asked_at_2025-08-13T18:00:00Z/
asked_at_2025-08-21T18:00:00Z/
asked_at_2025-08-22T18:00:00Z/
asked_at_2026-01-13T18:00:00Z/
asked_at_2026-03-04T18:00:00Z/
asked_at_2026-04-08T18:00:00Z/
```

Note: the docs mention `.gz`, but the unpacked local copy uses plain `routes.json` and `sectors.geojson`.

## Raw Fields

### Routes

Top-level fields:

```ts
type RoutesFile = {
  asked_at: string;
  window_start: string;
  window_end: string;
  flights: Flight[];
};
```

Flight fields:

```ts
type Flight = {
  flight_number: string;
  take_off_time: string;
  scheduled_landing_time: string;
  origin_airport_icao: string;
  destination_airport_icao: string;
  cruise_altitude_ft: number;
  cruise_speed_kt: number;
  lats: number[];
  lons: number[];
  is_airborne: boolean;
};
```

Unique flight key:

```text
flight_number + take_off_time + origin_airport_icao
```

### Sectors

GeoJSON feature properties:

```ts
type SectorProperties = {
  name: string;
  altitude_from_ft: number;
  altitude_to_ft: number;
  capacity: number;
};
```

Geometry:

- Always `Polygon`
- Coordinates are `[lon, lat]`

Altitude bands:

- LOW: `[0, 35000)` feet
- HIGH: `[35000, 60000)` feet

### Weather

Each weather file contains:

```ts
type WeatherFile = {
  matrix: number[][];
};
```

File path tells the variable:

- `wx/refc/`: composite reflectivity in dBZ
- `wx/retop/`: echo-top altitude in feet

Filename encodes:

```text
{based_at}_{valid_from}_{valid_to}.npz
```

Grid constants:

```ts
const WEATHER_GRID = {
  rows: 256,
  cols: 358,
  latMin: 21.943,
  latMax: 55.7765,
  lonMin: -135.0,
  lonMax: -67.5,
};
```

Nodata:

- `refc <= -50`
- `retop < 0`

Weather conflict rule:

```text
refc >= 40 AND retop >= cruise_altitude_ft
```

## Backend Pipeline

### Step 1: Load Scenario

Input:

- `asked_at_YYYY-MM-DDTHH:MM:SSZ`

Output:

- routes metadata
- flights
- sorted weather strip metadata
- shared sectors

Implementation:

```text
backend/app/core/dataset.py
```

### Step 2: Build Time Bins

Use 15-minute bins aligned to weather `valid_from` and `valid_to`.

Output:

```ts
type TimeBin = {
  id: string;
  valid_from: string;
  valid_to: string;
  label: string;
};
```

Implementation:

```text
backend/app/core/time_bins.py
```

### Step 3: Interpolate Flights

For a given time:

- Skip flights not active between takeoff and landing.
- Estimate progress between 0 and 1.
- Interpolate along route waypoints.
- Return lat/lon/altitude.

Output:

```ts
type FlightPosition = {
  flight_id: string;
  flight_number: string;
  lat: number;
  lon: number;
  altitude_ft: number;
  speed_kt: number;
  origin: string;
  destination: string;
};
```

Implementation:

```text
backend/app/core/flight_interpolation.py
```

### Step 4: Compute Sector Occupancy

For each time bin:

- Assign active flights to LOW or HIGH band.
- Point-in-polygon against sectors.
- Count flights by sector.
- Compare count against capacity.

Output:

```ts
type SectorOccupancy = {
  sector_id: string;
  altitude_band: "LOW" | "HIGH";
  count: number;
  capacity: number;
  utilization_pct: number;
  overload_count: number;
  contributing_flight_ids: string[];
};
```

Implementation:

```text
backend/app/core/sector_occupancy.py
```

### Step 5: Compute Weather Conflicts

For each active flight sample:

- Convert lat/lon to weather grid index.
- Read `refc` and `retop` for that time bin.
- Apply conflict rule.

Output:

```ts
type WeatherConflict = {
  flight_id: string;
  sector_id: string | null;
  lat: number;
  lon: number;
  refc_dbz: number;
  retop_ft: number;
  altitude_ft: number;
  severity: "watch" | "alert";
};
```

Implementation:

```text
backend/app/core/weather_conflicts.py
```

### Step 6: Score Risks

Combine:

- sector utilization
- overload count
- time to peak
- weather conflicts
- number of affected flights
- downstream sector pressure

Suggested risk score:

```text
risk_score =
  min(100,
    utilization_pct * 0.45
    + weather_conflict_count * 1.5
    + overload_count * 4
    + downstream_pressure * 0.25
  )
```

Keep this inspectable. The UI should label it as an operational risk score, not a certified safety score.

Implementation:

```text
backend/app/core/risk_scoring.py
```

### Step 7: Generate Briefing

The briefing is the main backend product.

It should include:

- top risk
- cause
- impact
- agent findings
- recommendation cards
- confidence
- uncertainty

Implementation:

```text
backend/app/services/briefing_service.py
```

## API Contract

Base URL:

```text
http://localhost:8000
```

### GET `/api/scenarios`

Returns all scenario folders and basic metadata.

Response:

```ts
type ScenarioListResponse = {
  scenarios: Scenario[];
};

type Scenario = {
  id: string;
  asked_at: string;
  flight_count: number;
  time_bin_count: number;
  window_start: string;
  window_end: string;
};
```

### GET `/api/scenarios/{scenario_id}/summary`

Returns data needed to initialize the UI.

Response:

```ts
type ScenarioSummaryResponse = {
  scenario: Scenario;
  sectors: SectorFeatureCollection;
  time_bins: TimeBin[];
  initial_time_bin_id: string;
  top_risks: RiskSummary[];
};
```

### GET `/api/scenarios/{scenario_id}/state?time_bin_id=...`

Returns tactical state for one time bin.

Response:

```ts
type ScenarioStateResponse = {
  time_bin: TimeBin;
  flights: FlightPosition[];
  sector_occupancy: SectorOccupancy[];
  weather_conflicts: WeatherConflict[];
  weather_tiles: WeatherOverlayRef[];
  risks: RiskSummary[];
};
```

Weather overlays can start as precomputed PNGs or sampled GeoJSON points. Do not block the MVP on beautiful raster rendering.

### GET `/api/scenarios/{scenario_id}/briefing?time_bin_id=...`

Returns the main AI-style operational brief.

Response:

```ts
type BriefingResponse = {
  mode: "quick" | "detailed" | "full";
  headline: string;
  summary: string;
  primary_risk: RiskSummary;
  agents: AgentFinding[];
  recommendations: RecommendationCard[];
  confidence: ConfidenceBlock;
  generated_at: string;
};
```

Supporting types:

```ts
type RiskSummary = {
  id: string;
  sector_id: string;
  altitude_band: "LOW" | "HIGH";
  peak_time: string;
  risk_score: number;
  utilization_pct: number;
  affected_flight_count: number;
  projected_delay_minutes: number;
  causes: string[];
};

type AgentFinding = {
  agent: "Jarvis" | "Weather Boy" | "Air Marshal" | "Domino" | "Historian" | "Auditor";
  severity: "info" | "watch" | "alert";
  title: string;
  detail: string;
  evidence: string[];
};

type RecommendationCard = {
  id: string;
  title: string;
  action_type: "reroute" | "meter" | "altitude_cap" | "ground_delay" | "monitor";
  summary: string;
  expected_impact: string;
  confidence_pct: number;
  affected_flight_ids: string[];
  agent_contributors: string[];
  risks: string[];
};

type ConfidenceBlock = {
  overall_pct: number;
  support: string[];
  weaknesses: string[];
  divergence_alarm: DivergenceAlarm | null;
};

type DivergenceAlarm = {
  is_active: boolean;
  reason: string;
  confidence_delta_pct: number;
};
```

### POST `/api/actions/preview`

Used when the operator clicks Preview on an action card.

Request:

```ts
type ActionPreviewRequest = {
  scenario_id: string;
  time_bin_id: string;
  recommendation_id: string;
};
```

Response:

```ts
type ActionPreviewResponse = {
  recommendation_id: string;
  before: PreviewMetrics;
  after: PreviewMetrics;
  changed_sectors: SectorDelta[];
  narrative: string;
};

type PreviewMetrics = {
  max_utilization_pct: number;
  overloaded_sector_count: number;
  affected_flight_count: number;
  projected_delay_minutes: number;
};

type SectorDelta = {
  sector_id: string;
  before_utilization_pct: number;
  after_utilization_pct: number;
  delta_pct: number;
};
```

MVP behavior:

- Use deterministic mock previews based on the selected risk.
- Make the preview plausible and clearly labeled as a forecast simulation.
- Do not claim real rerouting optimization unless implemented.

## Frontend Layout

Single-screen operational app. No marketing landing page.

```text
+---------------------------------------------------------------+
| TopBar: Scenario selector | Time | Voice button | Status       |
+----------------------+----------------------------------------+
| TacticalMap          | SituationBrief                         |
|                      | AgentPanel                             |
| Sectors/weather      | RiskQueue                              |
| routes/flights       | ActionCards                            |
|                      |                                        |
+----------------------+----------------------------------------+
| TimeWarpSlider                                                |
+---------------------------------------------------------------+
```

Desktop layout:

- Left: map, 60 to 65 percent width.
- Right: briefing and actions, 35 to 40 percent width.
- Bottom: Time Warp timeline.

Mobile or narrow layout:

- Top: Situation Brief.
- Middle: map.
- Bottom: tabs for Agents, Risks, Actions.

## Frontend State

Global state:

```ts
type AppState = {
  scenarioId: string | null;
  timeBinId: string | null;
  selectedRiskId: string | null;
  selectedSectorId: string | null;
  selectedFlightId: string | null;
  layers: {
    sectors: boolean;
    weather: boolean;
    routes: boolean;
    conflicts: boolean;
  };
  briefingMode: "quick" | "detailed" | "full";
};
```

Async loading states:

- scenarios loading
- scenario summary loading
- time-bin state loading
- briefing loading
- action preview loading

Every async action needs:

- loading state
- error state
- retry path
- skeleton or placeholder

## Component Responsibilities

### `ScenarioSelector`

- Fetches `/api/scenarios`
- Lets user switch scenario
- Resets selected time bin and risk

### `TimeWarpSlider`

- Displays 15-minute bins
- Highlights bins with alert-level risk
- Drives `/state` and `/briefing` fetches

### `TacticalMap`

- Renders sectors
- Colors sectors by utilization
- Shows flight positions or route lines
- Shows weather conflict points
- Supports selecting sector or flight

### `SituationBrief`

- Shows the headline, summary, top cause, impact, and confidence.
- Must be readable in under 10 seconds.

### `AgentPanel`

- Displays findings from Weather Boy, Air Marshal, Domino, Historian, and Auditor.
- Use consistent agent rows, not decorative avatars.

### `RiskQueue`

- Sorted list of upcoming risks.
- Each item shows sector, peak time, utilization, affected flights, and severity.

### `ActionCards`

- Shows recommendations.
- Buttons: Preview, Accept, Modify, Reject.
- Only Preview needs full MVP behavior.
- Accept, Modify, and Reject can update local UI state and produce a clear toast.

## Design System Tokens

Put in:

```text
frontend/src/styles/tokens.css
```

Suggested tokens:

```css
:root {
  --color-bg: #0f1419;
  --color-surface: #151c23;
  --color-surface-2: #1d2630;
  --color-border: #2a3642;
  --color-text: #eef3f7;
  --color-muted: #9aa7b3;
  --color-selected: #4ea3ff;
  --color-watch: #f3b743;
  --color-alert: #e85d5d;
  --color-good: #62c78f;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;

  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 20px;
  --font-size-xl: 24px;

  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

## Anti-Vibe Coding Practices

These rules are part of the scaffold. Treat them as acceptance criteria for frontend work, not polish to add at the end.

### Colors And Visual

- No default purple gradients unless brand-appropriate.
- Remove sparkles and emojis from hero headings.
- Eliminate generic glowing hover effects.
- Avoid one-note palettes.
- Use operational colors intentionally:
  - neutral background
  - blue or cyan for selected state
  - amber for watch
  - red for alert
  - green only for confirmed improvement

### Typography

- Use a consistent weight hierarchy.
- Avoid oversized headings paired with ultra-thin body text.
- Use uniform line-height and paragraph spacing.
- Define a type scale and stick to it.
- Use compact dashboard typography for dense operational views.

### Layout And Components

- Use identical component placement across pages and states.
- Define 2 to 3 border radius values maximum.
- Use subtle hover states with 2 to 4px lift maximum.
- Keep icon sizing proportional to text.
- Remove non-functional social icons.
- Do not put cards inside cards.
- Prefer dense, scan-friendly operational layouts over marketing sections.
- Use icons only when they clarify an action.

### Animations And Interactions

- Add easing curves with `cubic-bezier`.
- Stagger timing intentionally.
- Every animation must serve comprehension.
- Avoid animation that makes operational state harder to read.

### UX Behaviors

- Add loading states for all async actions.
- Add progress indicators on buttons.
- Use functional toggles, filters, timeline controls, and preview actions.
- Use skeleton screens for data-heavy sections.
- Empty states must say what data is missing and what the operator can do next.

### Copywriting

- Remove em-dash overuse.
- Avoid vague phrases such as "Launch faster", "Build your dreams", and "Create without limits".
- No fake testimonials.
- No generic AI faces.
- No placeholder persona names like "Sarah Chen".
- Use direct operational language.

### Core Principle

Create a design system first. Every color, spacing, and font variation should reference that system. Inconsistency signals vibe-coding more than any single visual choice.

## Integration Milestones

### Milestone 1: Static Contract

Backend:

- Create sample JSON responses in `shared/sample-responses/`.
- Serve hardcoded `/api/scenarios`, `/summary`, `/state`, and `/briefing`.

Frontend:

- Build full UI against sample responses.
- Implement loading and error states.

Done when:

- Frontend can run without the real data pipeline.

### Milestone 2: Real Scenario Loading

Backend:

- Load actual routes, sectors, and weather metadata.
- Return real scenario list and time bins.

Frontend:

- Scenario selector uses real backend.

Done when:

- User can switch between all 11 scenarios.

### Milestone 3: Real Risk Computation

Backend:

- Interpolate flight positions.
- Assign sectors.
- Compute occupancy and utilization.
- Compute weather conflicts.
- Generate top risks.

Frontend:

- Map and risk queue reflect real scenario state.

Done when:

- Risk queue changes as the timeline moves.

### Milestone 4: Briefing And Action Preview

Backend:

- Generate agent findings.
- Generate recommendation cards.
- Generate deterministic preview deltas.

Frontend:

- Situation brief and action preview feel polished.

Done when:

- Demo flow can be completed in under 3 minutes.

## Backend Notes

### Performance

The dataset is modest but geospatial checks can get slow.

Use:

- scenario-level caching
- prepared Shapely geometries
- bounding-box prefilter before point-in-polygon
- 15-minute bins rather than per-second simulation
- only top N risks in API responses

### Caching

Cache files can live in:

```text
data/cache/{scenario_id}/
```

Suggested derived files:

```text
time_bins.json
sector_occupancy.json
weather_conflicts.json
risks.json
briefings.json
```

Cache invalidation can be simple:

- Rebuild if cache missing.
- Add a manual `--force` flag later.

### Testing

Minimum backend tests:

- Dataset path loads.
- All 11 scenarios discovered.
- Weather filenames parse.
- Flight interpolation returns origin at takeoff.
- Flight interpolation returns destination at landing.
- Weather grid conversion stays in bounds.
- Sector capacity output contains capacity and utilization.

## Frontend Notes

### Map Practicality

Do not overbuild the map first.

MVP map layers:

- sectors as GeoJSON polygons
- routes as thin lines for selected or affected flights
- weather conflict points
- selected sector highlight

Weather raster can be simplified:

- alert grid points
- low-resolution canvas overlay
- precomputed PNG

Pick the fastest option that makes weather impact legible.

### Copy Style

Use direct operational language:

- "Sector HIGH_142 exceeds capacity in 18 minutes."
- "Weather intersects 23 planned routes."
- "Confidence reduced because echo tops diverge from historical match."

Avoid:

- "AI-powered insights at your fingertips"
- "Unlock the future of aviation"
- "Create without limits"

### Accessibility

Minimum:

- keyboard reachable controls
- visible focus states
- sufficient contrast
- no color-only alert meaning
- aria labels for icon buttons

## Demo Scenario Recommendation

Start by testing all 11 scenarios and choose the one with:

- visible weather conflicts
- at least one sector utilization breach or near breach
- a clear top risk
- enough affected flights to sound operationally meaningful

If no sector breaches capacity naturally, use near-capacity threshold:

```text
watch: utilization >= 85 percent
alert: utilization >= 100 percent
```

The UI can still be compelling with a watch state if the briefing explains escalation.

## Handoff Rules

- Backend owns data correctness and derived signals.
- Frontend owns interaction quality and visual clarity.
- API types should live in both `backend/app/core/schemas.py` and `frontend/src/lib/types.ts`.
- When the contract changes, update `shared/api-contract.md` and sample responses.
- Never add UI copy that claims unavailable data exists.
- Keep every recommendation explainable from fields in the bundle or clearly labeled heuristics.
