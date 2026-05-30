# DĒJÅ VŪ Intelligence

## One Sentence Pitch

DĒJÅ VŪ Intelligence is an AI-powered operational intelligence layer that combines future forecasting, historical precedent, explainable multi-agent reasoning, and voice-first interaction to help traffic flow managers understand complex airspace situations in seconds while remaining fully in control.

Product category:

- Airspace Comprehension Layer

Brand direction:

- ASI-inspired red, black, and white
- No gradients in the MVP
- Flat color, crisp borders, restrained shadows
- Logo to be added later

## Hackathon Mission

ASI supports live operational air traffic control software, not toy prototypes. A single software issue in this space can cost hundreds of millions of dollars and directly affect national airspace efficiency.

The challenge is to build something that makes the air traffic control system more efficient using the provided flight, weather, and airspace data. Open source data and tools are allowed with proper licensing, but the core demo should stand on the provided bundle.

Judging criteria:

- Technical merit
- Insight and problem understanding
- Communication and clarity within a 3-minute presentation

Judges:

- Lukash, cofounder
- John, VP Engineering
- Coupa, Senior Software Engineer

## Core Thesis

Air traffic managers already have data.

They have:

- Flight plans
- Weather forecasts
- Sector capacities
- Route information

The problem is not visibility. The problem is comprehension.

Current systems answer:

- What is happening?

Our system answers:

- What matters?
- What happens next?
- What should I pay attention to?
- Why should I trust this recommendation?

## Product Positioning

This is not:

- A dashboard
- A chatbot
- An autonomous controller
- A digital twin

This is:

An operational intelligence layer that sits on top of existing air traffic information and accelerates decision-making for traffic flow managers.

The product is designed for minutes-to-hours planning, not second-by-second tactical separation.

## Primary User

Traffic Flow Managers and Traffic Management Units.

Decision horizon:

- 15 minutes to several hours

Primary responsibilities:

- Weather management
- Sector capacity management
- Congestion prevention
- Route planning
- Traffic flow optimization

## Controller Workflow Focus

The dataset best supports the Traffic Flow Management comprehension loop:

1. Monitor projected demand vs. sector capacity.
2. Anticipate weather impact on filed routes.
3. Comprehend which future conflicts matter and why.
4. Decide on an intervention.
5. Re-monitor for downstream consequences.

Our hackathon scope targets step 3: comprehension.

The system should help an operator quickly understand:

- Which sector is at risk?
- When does the risk peak?
- Which flights contribute most?
- Is weather causing or worsening the issue?
- What downstream sectors or airports inherit the problem?
- Which intervention is plausible?
- What evidence supports or weakens that intervention?

## Design Principles

### Human In Control

Recommendations are never automatically executed.

The operator can:

- Approve
- Reject
- Modify
- Ask for evidence

All final decisions remain human decisions.

### Explainability First

Every recommendation must include:

- Why it was generated
- Which agents contributed
- Confidence level
- Historical support
- Known weaknesses
- Data used

No black-box outputs.

### Voice First, Mouse Second

Voice is a primary interface. Chat is secondary.

The product should feel closer to an operational command interface than a generic chatbot.

Push-to-talk only. No always-listening behavior.

Voice architecture:

- Operator input uses OpenAI Audio transcription.
- Jarvis and agent output uses ElevenLabs text-to-speech.
- Both providers must have mock fallbacks so the app still demos without live keys.
- Outside the meeting room, the operator talks only to Jarvis.
- Inside the meeting room, Jarvis moderates and the specialist agents can speak directly.
- Specialist agent voices are only active in the meeting room.

Example commands:

- "Jarvis, what am I missing?"
- "Show similar situations."
- "Compare recommendations."
- "Advance 30 minutes."
- "Why is this critical?"
- "Give me the quick version."

### Explain Like I Am Busy

Every response supports three levels:

- Quick: 10 to 15 second briefing
- Detailed: 30 to 60 second explanation
- Full Analysis: complete supporting evidence

Quick mode is default.

## Product Experience

### Tactical Airspace View

Displays:

- Flight routes
- Flight movement
- Airspace sectors
- Weather overlays
- Sector utilization
- Predicted risk zones

Purpose:

- Provide operational context.
- Support decisions.
- Make the AI briefing inspectable.

The map supports the product. The map is not the product.

### Situation Brief

Primary product experience. Always visible.

Continuously answers:

- What should I be paying attention to right now?

Example:

```text
Sector HIGH_142 is projected to exceed capacity in 18 minutes.

Cause:
- Convective weather blocks the eastern corridor.
- 22 flights converge through the same high-altitude sector.
- Utilization peaks at 118 percent of capacity.

Impact:
- 43 affected flights.
- 247 projected delay minutes.

Recommendation:
- Meter or reroute westbound flow before the sector peak.

Confidence:
- 87 percent.
```

### Action Cards

Recommendations are displayed as action cards.

Each card includes:

- Recommendation
- Confidence
- Expected impact
- Historical support
- Agent contributors
- Known risks

Controls:

- Preview
- Accept
- Modify
- Reject

For the hackathon, Accept and Modify can update the forecast view rather than push a real operational change.

## Agent Team

### Jarvis, Moderator

Default system name. Can be changed later to Athena, Atlas, Sentinel, or an operator-defined name.

Responsibilities:

- Coordinate agents
- Generate operational briefings
- Prioritize issues
- Present recommendations

Jarvis never performs deep analysis. Jarvis orchestrates.

### Weather Boy

Responsibilities:

- Weather impact analysis
- Route-weather conflicts
- Storm progression

Outputs:

- Weather risks
- Affected sectors
- Affected flights
- Confidence

Communication style:

- Short and direct

### Air Marshal

Responsibilities:

- Sector capacity forecasting
- Congestion detection
- Bottleneck identification

Outputs:

- Capacity risks
- Overload forecasts
- Sector alerts
- Contributing flights

Communication style:

- Operational and tactical

### Domino

Responsibilities:

- Downstream impact forecasting
- Delay propagation
- Network consequences

Outputs:

- Delay estimates
- Future effects
- Downstream sectors
- Airport arrival bank impact

Communication style:

- Consequence focused

### Historian

Responsibilities:

- Retrieve similar scenarios
- Surface historical outcomes
- Provide supporting evidence

Outputs:

- Similarity scores
- Prior interventions
- Lessons learned

Historian does not generate recommendations. Historian provides evidence.

Purpose:

- Trust building

### Auditor

Responsibilities:

- Challenge recommendations
- Identify uncertainty
- Highlight weaknesses

Outputs:

- Risks
- Assumptions
- Forecast limitations
- Confidence reductions

Purpose:

- Prevent overconfidence

The Auditor exists to disagree.

## Historical Intelligence And Time Warp

These are two halves of the same system.

- Historian equals past: What happened before?
- Time Warp equals future: What happens next?

Together they create a continuous operational timeline.

```text
PAST <---- PRESENT ----> FUTURE
```

Historian provides evidence. Time Warp provides forecasts. Jarvis combines both.

### Historical Intelligence

Purpose:

- Support recommendations with precedent.

Example:

```text
8 similar scenarios identified.
Most successful intervention: western reroute.
Observed success rate: 83 percent.
Average delay reduction: 18 percent.
```

Historian never claims certainty. Historian provides supporting evidence.

### Time Warp

Interactive forecasting system.

Timeline:

- Now
- 15 minutes
- 30 minutes
- 45 minutes
- 60 minutes

Updates:

- Weather evolution
- Sector utilization
- Congestion formation
- Risk escalation
- Recommendations

Purpose:

- Show future consequences before they occur.

### Divergence Alarm

Key differentiator.

Historian identifies a similar scenario. Auditor continuously compares current conditions against historical precedent.

Example:

```text
Historical match: 91 percent.
Forecast update: storm propagation exceeds historical pattern by 38 percent.
Divergence detected.
Historical recommendation confidence reduced.
Operator notified.
```

Purpose:

- Warn operators when precedent no longer applies.
- Show that the system knows when history stops being useful.

### Interrupt System

System proactively surfaces important risks.

Example:

```text
AIR MARSHAL ALERT
Sector HIGH_142 projected at 118 percent capacity.
Action recommended within 12 minutes.
```

Jarvis verbally announces critical events. The operator should not need to ask.

## Dataset Mapping

### Included Raw Data

Flights:

- `flight_number`
- `take_off_time`
- `scheduled_landing_time`
- `origin_airport_icao`
- `destination_airport_icao`
- `cruise_altitude_ft`
- `cruise_speed_kt`
- `lats`
- `lons`
- `is_airborne`

Route snapshot metadata:

- `asked_at`
- `window_start`
- `window_end`

Airspace:

- sector `name`
- `altitude_from_ft`
- `altitude_to_ft`
- `capacity`
- polygon `coordinates`

Weather:

- `refc` matrix: composite reflectivity in dBZ
- `retop` matrix: storm echo-top altitude in feet
- weather filename metadata: `based_at`, `valid_from`, `valid_to`

### Derived Signals

We should compute:

- Aircraft position over time
- Sector occupancy by 15-minute bin
- Sector utilization percent
- Capacity breach risk
- Weather conflict along route
- Affected flight list
- Arrival bank density by destination airport
- Downstream sector impact
- Delay estimate
- Similarity score across scenarios
- Divergence score between current and historical scenario

### Missing From Bundle

The following are not raw fields:

- Aircraft type
- Wake category
- Heading
- Climb and descent profile
- Live radar position
- ARTCC or facility name
- Runway configuration
- Airport acceptance rate
- Winds aloft
- Turbulence
- Icing
- Pilot requests
- Existing Traffic Management Initiatives
- Controller workload
- Active special-use airspace

Do not pretend these are present. If needed, label them as future extensions or proxies.

## Core Algorithms

### Flight Interpolation

Use the waypoint arrays and scheduled times to estimate aircraft position at a target time.

Hackathon assumption:

- Constant cruise altitude.
- Constant cruise speed.
- Linear interpolation along route geometry.
- `take_off_time` places aircraft at first waypoint.
- `scheduled_landing_time` places aircraft at last waypoint.

### Sector Occupancy

For each 15-minute forecast bin:

1. Interpolate each active flight position.
2. Select altitude band:
   - LOW if `0 <= cruise_altitude_ft < 35000`
   - HIGH if `35000 <= cruise_altitude_ft < 60000`
3. Point-in-polygon against the sector layer.
4. Count flights per sector.
5. Compare count to sector `capacity`.

Output:

- sector count
- capacity
- utilization percent
- overload amount
- contributing flights

### Weather Conflict

For each active flight sample:

1. Convert lat/lon to weather grid row/column.
2. Read `refc` and `retop`.
3. Mark weather conflict if:
   - `refc >= 40`
   - `retop >= cruise_altitude_ft`

Output:

- weather severity
- affected route segment
- affected sector
- affected flights

### Historical Similarity

Compare current risk window to other scenario windows using features such as:

- sector utilization curve
- number of affected flights
- weather intensity near route
- echo-top altitude
- time to peak risk
- downstream overloaded sectors

Output:

- top matching historical windows
- similarity score
- observed outcome proxy

Since the bundle does not include actual interventions, observed outcomes should be framed as simulated or proxy-based unless manually curated.

### Delay Estimate

For the hackathon, use an explainable heuristic:

```text
delay_minutes =
  overload_flights * overload_duration_bins * 7
  + weather_conflicted_flights * 4
  + downstream_overload_flights * 3
```

This is intentionally simple and inspectable. Do not present it as FAA-grade prediction.

## Demo Flow

1. Open tactical airspace view.
2. Operator asks: "Jarvis, what am I missing?"
3. Agents provide a short briefing.
4. Air Marshal identifies future congestion.
5. Weather Boy explains weather contribution.
6. Domino shows downstream consequences.
7. Historian surfaces similar precedent.
8. Auditor identifies uncertainty.
9. Recommendations appear as action cards.
10. Operator previews an action.
11. Time Warp updates the forecast.

## Recommended 3-Minute Pitch

### 0:00 to 0:30: Problem

Traffic flow managers are not missing data. They are drowning in disconnected layers: flights, weather, sectors, capacity, and future demand. The bottleneck is comprehension under time pressure.

### 0:30 to 1:05: Product

Airspace Comprehension Layer turns that pile of operational data into a 10-second brief: what matters, what happens next, and why the operator should trust or doubt the recommendation.

### 1:05 to 1:50: Demo

Show:

- map with sectors, routes, weather, and timeline
- voice prompt: "Jarvis, what am I missing?"
- situation brief
- agent evidence
- action card
- Time Warp before and after preview

### 1:50 to 2:30: Technical Merit

Explain:

- flight interpolation
- point-in-polygon sector demand
- HRRR weather conflict logic
- historical scenario retrieval
- explainable confidence and audit layer

### 2:30 to 3:00: Why It Matters

Operators stay in control. The software reduces cognitive load, surfaces risk earlier, and makes the reasoning inspectable.

## MVP Scope

Must have:

- Scenario selector
- Time slider with 15-minute bins
- Sector utilization forecast
- Weather overlay toggle
- Top risks list
- Situation brief
- Agent evidence panel
- Recommendation cards
- Preview action behavior
- Static push-to-talk button with typed fallback

Should have:

- Similar historical scenarios
- Divergence alarm
- Delay estimate
- Contributing flight list
- Airport arrival bank summary

Nice to have:

- Real voice transcription
- Animated flight movement
- Scenario comparison view
- Open source airport names
- Facility grouping if licensing and source clarity are easy

Out of scope:

- Real operational control execution
- Live flight feeds
- Real FAA integration
- Aircraft separation assurance
- Aircraft performance modeling
- Real intervention outcome labels

## Anti-Vibe Coding Practices

### Colors And Visual

- Use the ASI-inspired red, black, and white theme.
- No gradients in the MVP.
- No purple, blue, green, amber, or rainbow accent palette unless explicitly approved for a specific operational reason.
- Remove sparkles and emojis from hero headings.
- Eliminate generic glowing hover effects.
- Avoid one-note palettes.
- Use operational colors intentionally:
  - black for app background
  - dark gray for panels
  - white for primary text and selected outlines
  - red for brand accents, alert states, and critical calls to action
  - gray patterns, labels, or outlines for watch/neutral states instead of extra accent colors
- Use restrained shadows only for hierarchy.
- Do not use glow as a substitute for layout or contrast.

### Typography

- Use a consistent weight hierarchy.
- Avoid oversized headings paired with ultra-thin body text.
- Use uniform line-height and paragraph spacing.
- Define a type scale and stick to it.
- Use compact dashboard typography for dense operational views.

### Layout And Components

- Keep component placement consistent across pages.
- Define 2 to 3 border radius values maximum.
- Use subtle hover states, with 2 to 4px lift maximum.
- Keep icon sizing proportional to text.
- Remove non-functional social icons.
- Do not put cards inside cards.
- Prefer dense, scan-friendly operational layouts over marketing sections.

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

## Success Criteria

Judges should believe:

- This solves a real operational problem.
- The system reduces cognitive load.
- Recommendations are explainable.
- Operators remain in control.
- Historical evidence builds trust.
- Forecasting provides foresight.
- The product feels deployable.

## Build Priorities

1. Make the data pipeline produce believable risks.
2. Make the briefing clear enough to understand in 10 seconds.
3. Make the map and timeline visually support the briefing.
4. Make recommendations inspectable and auditable.
5. Polish the demo path so it works under a 3-minute pitch.
