import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type { AgentName, ChatMessage, ChatResponse } from "../lib/types";
import { useStore } from "../state/store";

type VoiceStatus = "idle" | "recording" | "processing" | "speaking" | "error";
type VoiceMode = "jarvis" | "meeting_room" | "agent";

type VoiceButtonProps = {
  mode?: VoiceMode;
  className?: string;
  enabled?: boolean;
};

function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (audioContext) return audioContext;
  const AudioContextCtor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioContextCtor) throw new Error("Audio playback is not available in this browser.");
  audioContext = new AudioContextCtor();
  return audioContext;
}

async function unlockAudioOutput() {
  const ctx = getAudioContext();
  if (ctx.state === "suspended") await ctx.resume();
}

function base64ToArrayBuffer(base64: string) {
  const clean = base64.replace(/\s/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function playAudioBase64(base64: string, contentType: string, signal?: AbortSignal) {
  if (!contentType.startsWith("audio/")) {
    throw new Error(`Voice response was not audio (${contentType}).`);
  }
  const ctx = getAudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  const audioBuffer = await ctx.decodeAudioData(base64ToArrayBuffer(base64).slice(0));
  return new Promise<void>((resolve, reject) => {
    const source = ctx.createBufferSource();
    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
    };
    const onEnded = () => {
      cleanup();
      resolve();
    };
    const onAbort = () => {
      cleanup();
      try {
        source.stop();
      } catch {
        // Source may already be stopped.
      }
      reject(new DOMException("Audio playback interrupted.", "AbortError"));
    };
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = onEnded;
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      source.start();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

function voiceIssue(agent: AgentName, message: string, code?: string | null) {
  return `${agent}: ${message}${code ? ` (${code})` : ""}`;
}

function agentMessages(chat: ChatResponse, mode: VoiceMode, targetAgent?: AgentName | null) {
  return chat.messages.filter(
    (message): message is ChatMessage & { agent: AgentName } =>
      message.role === "agent" &&
      !!message.agent &&
      (mode !== "agent" || message.agent === targetAgent) &&
      (mode !== "jarvis" || message.agent === "Jarvis")
  );
}

function roomVoiceMessages(messages: (ChatMessage & { agent: AgentName })[], mode: VoiceMode) {
  if (mode !== "meeting_room") return messages;
  const firstJarvis = messages.find((message) => message.agent === "Jarvis");
  const finalJarvis = [...messages].reverse().find((message) => message.agent === "Jarvis");
  const weather = messages.find((message) => message.agent === "Weather Boy");
  const firstSpecialist = messages.find((message) => message.agent !== "Jarvis");
  const picked = [firstJarvis, weather ?? firstSpecialist, finalJarvis].filter(Boolean) as (ChatMessage & {
    agent: AgentName;
  })[];
  return picked.filter((message, index) => picked.findIndex((item) => item === message) === index);
}

export default function VoiceButton({ mode = "jarvis", className, enabled }: VoiceButtonProps) {
  const scenarioId = useStore((s) => s.scenarioId);
  const timeBinId = useStore((s) => s.timeBinId);
  const meetingRoomOpen = useStore((s) => s.meetingRoom.open);
  const activeAgent = useStore((s) => (s.agentChat.open ? s.agentChat.agent : null));
  const activeAgentHistory = useStore((s) => s.agentChat.history);
  const askMeetingRoom = useStore((s) => s.askMeetingRoom);
  const setAgentChatResponses = useStore((s) => s.setAgentChatResponses);
  const showToast = useStore((s) => s.showToast);

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [replies, setReplies] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const busyRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const playbackAbortRef = useRef<AbortController | null>(null);
  const requestVersionRef = useRef(0);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const effectiveMode: VoiceMode = activeAgent ? "agent" : mode;
  const active =
    enabled ??
    (effectiveMode === "agent"
      ? true
      : effectiveMode === "meeting_room"
        ? meetingRoomOpen
        : !meetingRoomOpen && !activeAgent);
  const targetLabel =
    effectiveMode === "agent" && activeAgent
      ? activeAgent
      : effectiveMode === "meeting_room"
        ? "meeting room"
        : "Jarvis";
  const routeKey = `${effectiveMode}:${activeAgent ?? "none"}:${meetingRoomOpen ? "room" : "main"}`;
  const routeKeyRef = useRef(routeKey);

  const abortVoiceActivity = useCallback(() => {
    requestVersionRef.current += 1;
    playbackAbortRef.current?.abort();
    playbackAbortRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    cleanupStream();
    busyRef.current = false;
  }, [cleanupStream]);

  const playAgentReplies = useCallback(
    async (messages: ChatMessage[], expectedRouteKey: string) => {
      if (!messages.length) throw new Error(`No ${targetLabel} voice reply was returned.`);
      setStatus("speaking");
      const controller = new AbortController();
      playbackAbortRef.current = controller;
      const issues: string[] = [];
      let playedCount = 0;
      const agentReplies = messages.filter(
        (message): message is ChatMessage & { agent: AgentName } =>
          !!message.agent && !!message.content.trim()
      );
      const playableMessages = roomVoiceMessages(agentReplies, effectiveMode);
      const speechJobs = playableMessages.map(async (message) => ({
        message,
        speech: await api.synthesizeVoice({
          text: message.content,
          agent: message.agent,
          voice_id: message.voice_id,
          meeting_room: effectiveMode !== "jarvis",
        }),
      }));
      const speeches = await Promise.allSettled(speechJobs);
      for (const result of speeches) {
        if (routeKeyRef.current !== expectedRouteKey) break;
        if (controller.signal.aborted) break;
        if (result.status === "rejected") {
          issues.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
          continue;
        }
        const { message, speech } = result.value;
        if (!speech.is_playable || !speech.audio_base64) {
          issues.push(voiceIssue(message.agent, speech.message, speech.error_code));
          continue;
        }
        if (routeKeyRef.current !== expectedRouteKey) break;
        await playAudioBase64(speech.audio_base64, speech.content_type, controller.signal);
        playedCount += 1;
      }
      if (playbackAbortRef.current === controller) playbackAbortRef.current = null;
      if (playedCount === 0 && issues.length > 0) {
        throw new Error(issues.join(" "));
      }
      if (issues.length > 0) {
        const notice = issues.join(" ");
        setError(notice);
        showToast(notice);
      }
    },
    [effectiveMode, showToast, targetLabel]
  );

  const handleAudio = useCallback(
    async (audio: Blob) => {
      if (!scenarioId || !timeBinId) {
        setStatus("error");
        setError(`${targetLabel} is waiting for the scenario to finish loading.`);
        busyRef.current = false;
        return;
      }

      setStatus("processing");
      setError(null);
      const requestRouteKey = routeKeyRef.current;
      const requestVersion = ++requestVersionRef.current;
      const isCurrentRequest = () =>
        requestVersionRef.current === requestVersion && routeKeyRef.current === requestRouteKey;
      try {
        const transcription = await api.transcribeVoice(audio);
        if (!isCurrentRequest()) return;
        const text = transcription.text.trim();
        setTranscript(text);
        if (!text) throw new Error(transcription.message || "No speech was detected.");

        const chat =
          effectiveMode === "agent" && activeAgent
            ? await api.meetingRoomChat(
                {
                  scenario_id: scenarioId,
                  time_bin_id: timeBinId,
                  message: text,
                  requested_agents: [activeAgent],
                  history: activeAgentHistory.slice(-8),
                },
                true
              )
            : effectiveMode === "meeting_room"
              ? await askMeetingRoom(text, true)
              : await api.jarvisChat({
                scenario_id: scenarioId,
                time_bin_id: timeBinId,
                message: text,
              });
        if (!isCurrentRequest()) return;
        if (!chat) {
          setStatus("idle");
          return;
        }

        if (effectiveMode === "agent") setAgentChatResponses(chat, text);

        const messages = agentMessages(chat, effectiveMode, activeAgent);
        if (!messages.length) {
          setStatus("idle");
          return;
        }
        setReplies(messages);
        await playAgentReplies(messages, requestRouteKey);
        if (isCurrentRequest()) setStatus("idle");
      } catch (err) {
        if (!isCurrentRequest()) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : String(err);
        setStatus("error");
        setError(message);
        showToast(message);
      } finally {
        if (requestVersionRef.current === requestVersion) busyRef.current = false;
      }
    },
    [
      activeAgent,
      activeAgentHistory,
      askMeetingRoom,
      effectiveMode,
      playAgentReplies,
      scenarioId,
      setAgentChatResponses,
      showToast,
      targetLabel,
      timeBinId,
    ]
  );

  const startRecording = useCallback(async () => {
    if (!active || status === "recording") return;
    void unlockAudioOutput().catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
    });
    if (busyRef.current && (status === "speaking" || status === "processing")) {
      abortVoiceActivity();
      setStatus("idle");
    }
    if (busyRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("error");
      setError("Microphone recording is not available in this browser.");
      return;
    }

    busyRef.current = true;
    setStatus("recording");
    setError(null);
    setTranscript("");
    setReplies([]);
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
  }, [abortVoiceActivity, active, cleanupStream, handleAudio, status]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      if (busyRef.current && status === "recording") stopRequestedRef.current = true;
      return;
    }
    recorder.stop();
  }, [status]);

  useEffect(() => {
    if (routeKeyRef.current !== routeKey) {
      abortVoiceActivity();
      setStatus("idle");
    }
    routeKeyRef.current = routeKey;
  }, [abortVoiceActivity, routeKey]);

  useEffect(() => {
    if (!active) {
      abortVoiceActivity();
      if (status === "recording" || status === "processing" || status === "speaking") {
        setStatus("idle");
      }
    }
  }, [abortVoiceActivity, active, status]);

  useEffect(() => {
    return () => {
      abortVoiceActivity();
    };
  }, [abortVoiceActivity]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!active || event.repeat) return;
      if (event.code === "KeyM" || event.key.toLowerCase() === "m") {
        event.preventDefault();
        event.stopPropagation();
        void startRecording();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!active && !recorderRef.current) return;
      if (event.code === "KeyM" || event.key.toLowerCase() === "m") {
        event.preventDefault();
        event.stopPropagation();
        stopRecording();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      cleanupStream();
    };
  }, [active, cleanupStream, effectiveMode, startRecording, stopRecording]);

  const buttonText =
    status === "recording"
      ? "Listening..."
      : status === "processing"
        ? `Hold M: Interrupt`
        : status === "speaking"
          ? effectiveMode === "meeting_room"
            ? "Hold M: Cut in"
            : `Hold M: Cut in`
          : effectiveMode === "agent"
            ? `Hold M: ${targetLabel}`
            : effectiveMode === "meeting_room"
            ? "Hold M: Ask all"
            : "Hold M: Jarvis";

  return (
    <div className={`voice-control ${className ?? ""}`.trim()}>
      <button
        type="button"
        className={`ptt-button ${status === "recording" ? "listening" : ""}`}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void unlockAudioOutput().catch((err) => {
            setError(err instanceof Error ? err.message : String(err));
          });
          event.currentTarget.setPointerCapture(event.pointerId);
          void startRecording();
        }}
        onPointerUp={(event) => {
          event.preventDefault();
          event.stopPropagation();
          stopRecording();
        }}
        onPointerCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          stopRecording();
        }}
        onClick={(event) => event.stopPropagation()}
        disabled={!active || status === "processing"}
        aria-pressed={status === "recording"}
      >
        {buttonText}
      </button>

      {(transcript || replies.length > 0 || error || status !== "idle") && (
        <div className={`voice-status-card ${error ? "error" : ""}`}>
          {status !== "idle" && <div className="voice-state">{buttonText}</div>}
          {transcript && <p className="voice-transcript">You: {transcript}</p>}
          {replies.map((reply) => (
            <p key={`${reply.agent}-${reply.source ?? "voice"}`} className="voice-response">
              {reply.agent}: {reply.content}
            </p>
          ))}
          {error && <p className="voice-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
