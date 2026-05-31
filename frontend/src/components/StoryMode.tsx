import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../state/store";

type StoryStep = "name" | "welcome" | "replay" | "round1" | "round2" | "round3" | "scorecard" | null;

type Choice = {
  id: string;
  label: string;
  sublabel: string;
  detail?: string;
};

type RoundKey = "round1" | "round2" | "round3";

const STORAGE_KEY = "dejavu_story_complete";

const ROUND_ORDER: RoundKey[] = ["round1", "round2", "round3"];
const WINNING_CHOICES: Record<RoundKey, string> = {
  round1: "reroute",
  round2: "widen",
  round3: "risko",
};

const SCORE_RESULTS = [
  {
    outcome: "Cascade loss",
    percentile: 18,
    activeIndex: 1,
    body: "The delay wave still spreads. Use the agents earlier and try a cleaner intervention.",
  },
  {
    outcome: "Partial save",
    percentile: 37,
    activeIndex: 3,
    body: "You slowed the problem, but one missed call let the network absorb avoidable delay.",
  },
  {
    outcome: "Operational win",
    percentile: 61,
    activeIndex: 5,
    body: "You kept the worst sectors stable and avoided the main downstream cascade.",
  },
  {
    outcome: "Clean win",
    percentile: 78,
    activeIndex: 6,
    body: "You matched the strongest playbook, adapted when the storm moved, and made the human call.",
  },
];

const TIMEOUT_CHOICE = "timeout";
const DECISION_SECONDS = 20;

const MEMORY_CARDS = [
  "Aug 21 storm line",
  "HIGH_142 overload",
  "ORD/EWR cascade",
  "Western reroute",
  "Ground delay",
  "Storm drift",
  "Confidence break",
  "Final recovery",
];

const ROUND_1: Choice[] = [
  { id: "reroute", label: "Reroute West", sublabel: "take the scenic route", detail: "Held 6 of 8, plus 14 min" },
  { id: "delay", label: "Ground Delay", sublabel: "keep them waiting", detail: "Held 7 of 8, plus 90 min" },
  { id: "keep", label: "Keep the Routes", sublabel: "trust your gut", detail: "1 of 8, see Aug 21" },
];

const ROUND_2: Choice[] = [
  { id: "hold", label: "Hold your plan", sublabel: "ride it out" },
  { id: "widen", label: "Widen the reroute", sublabel: "buy more sky" },
  { id: "stop", label: "Ground stop", sublabel: "everybody freeze" },
];

const ROUND_3: Choice[] = [
  { id: "history", label: "Historian's precedent", sublabel: "we have seen this before" },
  { id: "risko", label: "Risko's caution", sublabel: "better safe than sorry" },
  { id: "gut", label: "Your own gut", sublabel: "you outrank the algorithm" },
];

function shouldForceDemo() {
  return new URLSearchParams(window.location.search).has("demo");
}

export default function StoryMode() {
  const summary = useStore((s) => s.summary);
  const briefing = useStore((s) => s.briefing);
  const timeBinId = useStore((s) => s.timeBinId);
  const setTimeBin = useStore((s) => s.setTimeBin);
  const previewAction = useStore((s) => s.previewAction);
  const decideAction = useStore((s) => s.decideAction);
  const openMeetingRoom = useStore((s) => s.openMeetingRoom);
  const askMeetingRoom = useStore((s) => s.askMeetingRoom);
  const showToast = useStore((s) => s.showToast);

  const timers = useRef<number[]>([]);
  const [step, setStep] = useState<StoryStep>(() => {
    if (shouldForceDemo()) return "name";
    return sessionStorage.getItem(STORAGE_KEY) === "1" ? null : "name";
  });
  const [controller, setController] = useState("");
  const [choice1, setChoice1] = useState<string | null>(null);
  const [choice2, setChoice2] = useState<string | null>(null);
  const [choice3, setChoice3] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState(0);
  const [decisionClock, setDecisionClock] = useState(10);
  const [submittedChoices, setSubmittedChoices] = useState<Record<RoundKey, string | null>>({
    round1: null,
    round2: null,
    round3: null,
  });

  const initialBin = summary?.initial_time_bin_id ?? timeBinId;
  const demoBins = useMemo(() => summary?.time_bins ?? [], [summary]);
  const score = ROUND_ORDER.filter((round) => submittedChoices[round] === WINNING_CHOICES[round]).length;
  const scoreResult = SCORE_RESULTS[score];

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  const schedule = (delayMs: number, fn: () => void) => {
    const timer = window.setTimeout(fn, delayMs);
    timers.current.push(timer);
  };

  const jumpToBin = (index: number) => {
    const bin = demoBins[index];
    if (bin) void setTimeBin(bin.id);
  };

  const finishStory = () => {
    clearTimers();
    sessionStorage.setItem(STORAGE_KEY, "1");
    setStep(null);
  };

  const startStory = () => {
    const name = controller.trim() || "Judge";
    setController(name);
    setStep("welcome");
    clearTimers();

    schedule(10_000, () => {
      jumpToBin(8);
      setStep("replay");
    });
    schedule(34_000, () => {
      if (initialBin) void setTimeBin(initialBin);
    });
    schedule(35_000, () => setStep("round1"));
    schedule(75_000, () => {
      jumpToBin(4);
      setStep("round2");
    });
    schedule(110_000, () => {
      const prompt =
        "Meeting room, give the fastest debate: is this case still like the historical analog?";
      openMeetingRoom(prompt);
      void askMeetingRoom(prompt, true);
      setStep("round3");
    });
    schedule(140_000, () => setStep("scorecard"));
    schedule(170_000, finishStory);
  };

  const missDecision = (round: RoundKey, reason = "Time expired") => {
    setSubmittedChoices((current) => ({ ...current, [round]: TIMEOUT_CHOICE }));
    showToast(`${reason}: no point`);
    setStep(round === "round3" ? "scorecard" : null);
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    if (step !== "round1" && step !== "round2" && step !== "round3") return undefined;

    const round = step;
    setDecisionClock(DECISION_SECONDS);
    const tick = window.setInterval(() => {
      setDecisionClock((current) => Math.max(0, current - 1));
    }, 1_000);
    const timeout = window.setTimeout(() => {
      window.clearInterval(tick);
      missDecision(round);
    }, DECISION_SECONDS * 1_000);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timeout);
    };
  }, [step]);

  if (!step) return null;

  const chooseMemory = (index: number) => {
    setSelectedMemory(index);
    showToast(`Ghost loaded: ${MEMORY_CARDS[index]}`);
    jumpToBin(Math.min(index + 1, demoBins.length - 1));
  };

  const submitDecision = (round: RoundKey, choiceId: string | null, choices: Choice[]) => {
    const choice = choices.find((item) => item.id === choiceId);
    if (!choice) {
      showToast("Pick an option before submitting.");
      return;
    }

    const scored = choice.id === WINNING_CHOICES[round];
    setSubmittedChoices((current) => ({ ...current, [round]: choice.id }));
    showToast(`${scored ? "Point scored" : "No point"}: ${choice.label}`);

    if (round === "round1") {
      const recommendation =
        choice.id === "reroute"
          ? briefing?.recommendations.find((item) => item.action_type === "reroute")
          : choice.id === "delay"
            ? briefing?.recommendations[0]
            : null;
      if (recommendation) void previewAction(recommendation.id);
    }

    if (round === "round2") {
      jumpToBin(choice.id === "widen" ? 7 : choice.id === "stop" ? 3 : 5);
    }

    if (round === "round3") {
      const rec = briefing?.recommendations[0];
      if (rec) void decideAction(rec.id, choice.id === "gut" ? "modify" : "accept", choice.label);
      setStep("scorecard");
      return;
    }

    setStep(null);
  };

  const chooseRound1 = (choice: Choice) => {
    setChoice1(choice.id);
    showToast(`Round 1 selected: ${choice.label}`);
  };

  const chooseRound2 = (choice: Choice) => {
    setChoice2(choice.id);
    showToast(`Round 2 selected: ${choice.label}`);
  };

  const chooseRound3 = (choice: Choice) => {
    setChoice3(choice.id);
    showToast(`Final call selected: ${choice.label}`);
  };

  return (
    <div className={`story-layer story-layer--${step}`} aria-live="polite">
      {step === "name" && (
        <div className="story-modal story-modal--name" role="dialog" aria-label="Start demo">
          <p className="story-kicker">Act 0</p>
          <h2>You have the watch</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              startStory();
            }}
          >
            <label>
              Controller name
              <input
                autoFocus
                value={controller}
                onChange={(event) => setController(event.target.value)}
                placeholder="Judge name"
              />
            </label>
            <div className="story-actions">
              <button className="btn primary" type="submit">
                Start story
              </button>
              <button className="btn" type="button" onClick={finishStory}>
                Skip
              </button>
            </div>
          </form>
        </div>
      )}

      {step === "welcome" && (
        <StoryToast
          kicker="Act 0"
          title={`Welcome, Controller ${controller || "Judge"}.`}
          body="Jarvis online. You have the watch."
        />
      )}

      {step === "replay" && (
        <StoryToast
          kicker="Act 1"
          title="Last time someone hesitated."
          body="The Aug 21 ghost ignites HIGH_142, then Domino cascades 247 minutes into ORD and EWR. Snapping back to now."
          ghost
        />
      )}

      {step === "round1" && (
        <DecisionModal
          kicker="Round 1"
          title="HIGH_142 breaches in 18 minutes. Your move, Controller?"
          body="Pick the closest historical case, then choose the first intervention."
          choices={ROUND_1}
          selected={choice1}
          onChoose={chooseRound1}
          onSubmit={() => submitDecision("round1", choice1, ROUND_1)}
          timeRemaining={decisionClock}
          memory
          selectedMemory={selectedMemory}
          onChooseMemory={chooseMemory}
          onClose={() => missDecision("round1", "Round skipped")}
        />
      )}

      {step === "round2" && (
        <DecisionModal
          kicker="Round 2"
          title="The storm is outrunning every past playbook by 38%. Stick or pivot?"
          body="The solid live track is peeling away from the dotted ghost analog."
          choices={ROUND_2}
          selected={choice2}
          onChoose={chooseRound2}
          onSubmit={() => submitDecision("round2", choice2, ROUND_2)}
          timeRemaining={decisionClock}
          ghost
          onClose={() => missDecision("round2", "Round skipped")}
        />
      )}

      {step === "round3" && (
        <DecisionModal
          kicker="Round 3"
          title="The agents cannot agree. Who do you trust?"
          body="The meeting room is open. Use the agents, then commit the final plan."
          choices={ROUND_3}
          selected={choice3}
          onChoose={chooseRound3}
          onSubmit={() => submitDecision("round3", choice3, ROUND_3)}
          timeRemaining={decisionClock}
          onClose={() => missDecision("round3", "Round skipped")}
        />
      )}

      {step === "scorecard" && (
        <div className="story-modal story-scorecard" role="dialog" aria-label="Demo scorecard">
          <p className="story-kicker">Act 5</p>
          <h2>{scoreResult.outcome}</h2>
          <p>
            You scored {score}/3 decision points. Against 8 historical analogs, you ranked in the{" "}
            {scoreResult.percentile}th percentile.
          </p>
          <div className="score-distribution">
            {MEMORY_CARDS.map((card, index) => (
              <span key={card} className={index === scoreResult.activeIndex ? "active" : ""} />
            ))}
          </div>
          <p className="text-dim">{scoreResult.body}</p>
          <button className="btn primary" onClick={finishStory}>
            Continue dashboard
          </button>
        </div>
      )}
    </div>
  );
}

function StoryToast({
  kicker,
  title,
  body,
  ghost,
}: {
  kicker: string;
  title: string;
  body: string;
  ghost?: boolean;
}) {
  return (
    <div className={`story-toast ${ghost ? "ghost" : ""}`}>
      <p className="story-kicker">{kicker}</p>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function DecisionModal({
  kicker,
  title,
  body,
  choices,
  selected,
  onChoose,
  onSubmit,
  timeRemaining,
  onClose,
  memory,
  selectedMemory,
  onChooseMemory,
  ghost,
}: {
  kicker: string;
  title: string;
  body: string;
  choices: Choice[];
  selected: string | null;
  onChoose: (choice: Choice) => void;
  onSubmit: () => void;
  timeRemaining: number;
  onClose: () => void;
  memory?: boolean;
  selectedMemory?: number;
  onChooseMemory?: (index: number) => void;
  ghost?: boolean;
}) {
  return (
    <div className={`story-modal decision-modal ${ghost ? "ghost" : ""}`} role="dialog" aria-label={kicker}>
      <div className="story-modal-header">
        <div>
          <p className="story-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
        <div className="story-clock" aria-label={`${timeRemaining} seconds remaining`}>
          <strong>{timeRemaining}</strong>
          <span>sec</span>
        </div>
      </div>
      <p className="text-dim">{body}</p>

      {memory && (
        <div className="memory-reel" aria-label="Historical memory reel">
          {MEMORY_CARDS.map((card, index) => (
            <button
              key={card}
              className={index === selectedMemory ? "active" : ""}
              type="button"
              aria-pressed={index === selectedMemory}
              onClick={() => onChooseMemory?.(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {card}
            </button>
          ))}
        </div>
      )}

      <div className="story-choice-grid">
        {choices.map((choice) => (
          <button
            key={choice.id}
            className={selected === choice.id ? "selected" : ""}
            type="button"
            onClick={() => onChoose(choice)}
          >
            <strong>{choice.label}</strong>
            <span>{choice.sublabel}</span>
            {choice.detail && <small>{choice.detail}</small>}
          </button>
        ))}
      </div>

      <div className="story-decision-footer">
        <span>{selected ? "Selection ready" : "Choose one option to continue"}</span>
        <button className="btn" type="button" onClick={onClose}>
          Skip
        </button>
        <button className="btn primary" type="button" disabled={!selected} onClick={onSubmit}>
          Submit decision
        </button>
      </div>
    </div>
  );
}
