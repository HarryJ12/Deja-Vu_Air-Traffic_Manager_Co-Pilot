import { useEffect, useRef } from "react";
import { useStore } from "../state/store";

// Visual klaxon (always when alert) + optional Web Audio beep (operator-enabled,
// to satisfy browser autoplay policy). The active condition is any breach or a
// live divergence alarm.
export default function Alarm() {
  const state = useStore((s) => s.state);
  const briefing = useStore((s) => s.briefing);
  const alarmSound = useStore((s) => s.alarmSound);

  const breach = (state?.sector_occupancy ?? []).some((s) => s.utilization_pct >= 100);
  const diverging = !!briefing?.confidence.divergence_alarm?.is_active;
  const active = breach || diverging;

  const ctxRef = useRef<AudioContext | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const stop = () => {
      if (timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    };
    if (!active || !alarmSound) {
      stop();
      return stop;
    }

    if (!ctxRef.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new AC();
    }
    const ac = ctxRef.current;
    void ac.resume();

    const beep = () => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ac.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18);
      osc.connect(gain).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.2);
    };
    beep();
    timer.current = window.setInterval(beep, 1100);
    return stop;
  }, [active, alarmSound]);

  if (!active) return null;

  const label = breach ? "CAPACITY BREACH" : "DIVERGENCE ALARM";

  return (
    <div className="alarm-strip" role="alert">
      <span className="status-dot critical" />
      <span className="alarm-text">{label}</span>
      <span className="alarm-sub monospace">
        {breach
          ? "Sector over capacity — action required"
          : "Forecast diverging from precedent"}
      </span>
    </div>
  );
}
