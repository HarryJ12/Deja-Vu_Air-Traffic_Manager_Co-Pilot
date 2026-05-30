import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useStore } from "../state/store";

type VoiceStatus = "idle" | "recording" | "processing" | "speaking" | "error";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
}

function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function base64ToBlob(base64: string, contentType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

async function playAudioBase64(base64: string, contentType: string) {
  const blob = base64ToBlob(base64, contentType);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  try {
    await audio.play();
    audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export default function VoiceButton() {
  const scenarioId = useStore((s) => s.scenarioId);
  const timeBinId = useStore((s) => s.timeBinId);
  const showToast = useStore((s) => s.showToast);

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [jarvisReply, setJarvisReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const busyRef = useRef(false);
  const stopRequestedRef = useRef(false);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const handleAudio = useCallback(
    async (audio: Blob) => {
      if (!scenarioId || !timeBinId) {
        setStatus("error");
        setError("Jarvis is waiting for the scenario to finish loading.");
        busyRef.current = false;
        return;
      }

      setStatus("processing");
      setError(null);
      try {
        const transcription = await api.transcribeVoice(audio);
        const text = transcription.text.trim();
        setTranscript(text);
        if (!text) throw new Error(transcription.message || "No speech was detected.");

        const chat = await api.jarvisChat({
          scenario_id: scenarioId,
          time_bin_id: timeBinId,
          message: text,
        });
        const reply = chat.messages.find((m) => m.agent === "Jarvis")?.content ?? chat.note;
        setJarvisReply(reply);

        const speech = await api.synthesizeVoice({
          text: reply,
          agent: "Jarvis",
          meeting_room: false,
        });
        if (speech.audio_base64) {
          setStatus("speaking");
          await playAudioBase64(speech.audio_base64, speech.content_type);
        } else {
          showToast(speech.message);
        }
        setStatus("idle");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStatus("error");
        setError(message);
        showToast(message);
      } finally {
        busyRef.current = false;
      }
    },
    [scenarioId, showToast, timeBinId]
  );

  const startRecording = useCallback(async () => {
    if (busyRef.current || status === "recording") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("error");
      setError("Microphone recording is not available in this browser.");
      return;
    }

    busyRef.current = true;
    setStatus("recording");
    setError(null);
    setTranscript("");
    setJarvisReply("");
    chunksRef.current = [];
    stopRequestedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const audio = new Blob(chunksRef.current, { type });
        cleanupStream();
        recorderRef.current = null;
        void handleAudio(audio);
      };
      recorder.start();
      if (stopRequestedRef.current && recorder.state !== "inactive") {
        recorder.stop();
      }
    } catch (err) {
      cleanupStream();
      busyRef.current = false;
      stopRequestedRef.current = false;
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [cleanupStream, handleAudio, status]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      if (busyRef.current && status === "recording") stopRequestedRef.current = true;
      return;
    }
    recorder.stop();
  }, [status]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isEditableTarget(event.target)) return;
      if (event.code === "KeyM" || event.key.toLowerCase() === "m") {
        event.preventDefault();
        void startRecording();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.code === "KeyM" || event.key.toLowerCase() === "m") {
        event.preventDefault();
        stopRecording();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      cleanupStream();
    };
  }, [cleanupStream, startRecording, stopRecording]);

  const buttonText =
    status === "recording"
      ? "Listening..."
      : status === "processing"
        ? "Sending to Jarvis..."
        : status === "speaking"
          ? "Jarvis speaking..."
          : "Hold M: Jarvis";

  return (
    <div className="voice-control">
      <button
        className={`ptt-button ${status === "recording" ? "listening" : ""}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          void startRecording();
        }}
        onPointerUp={stopRecording}
        onPointerCancel={stopRecording}
        disabled={status === "processing" || status === "speaking"}
        aria-pressed={status === "recording"}
      >
        {buttonText}
      </button>

      {(transcript || jarvisReply || error || status !== "idle") && (
        <div className={`voice-status-card ${error ? "error" : ""}`}>
          {status !== "idle" && <div className="voice-state">{buttonText}</div>}
          {transcript && <p className="voice-transcript">You: {transcript}</p>}
          {jarvisReply && <p className="voice-response">Jarvis: {jarvisReply}</p>}
          {error && <p className="voice-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
