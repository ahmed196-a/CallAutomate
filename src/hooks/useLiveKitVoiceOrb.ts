import { useEffect, useRef, useState, useCallback } from "react";
import {
  Room,
  RoomEvent,
  ParticipantKind,
  Track,
  RpcError,
  type RpcInvocationData,
} from "livekit-client";

export interface UseLiveKitVoiceOrbProps {
  isOpen: boolean;
  onAction: (name: string, input: any) => Promise<any>;
  onChatMessage: (sender: "agent" | "user", text: string) => void;
}

export interface UseLiveKitVoiceOrbReturn {
  callStatus: "greeting" | "listening" | "speaking" | "muted";
  statusText: string;
  isMuted: boolean;
  toggleMute: () => void;
  handleUserInput: (rawText: string) => Promise<void>;
  speakingRef: React.MutableRefObject<boolean>;
  mutedRef: React.MutableRefObject<boolean>;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
  audioDataRef: React.MutableRefObject<Uint8Array | null>;
}

export function useLiveKitVoiceOrb({
  isOpen,
  onAction,
  onChatMessage,
}: UseLiveKitVoiceOrbProps): UseLiveKitVoiceOrbReturn {
  const [callStatus, setCallStatus] = useState<"greeting" | "listening" | "speaking" | "muted">("greeting");
  const [statusText, setStatusText] = useState<string>("Connecting to CallAutomate...");
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const roomRef = useRef<Room | null>(null);
  const agentAudioElsRef = useRef<HTMLMediaElement[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);

  const speakingRef = useRef<boolean>(false);
  const mutedRef = useRef<boolean>(false);

  // Latest UI-action handler reference to prevent stale closure
  const actionHandlerRef = useRef<(name: string, input: any) => Promise<any>>(onAction);
  actionHandlerRef.current = onAction;

  // Latest chat message handler reference
  const onChatMessageRef = useRef<(sender: "agent" | "user", text: string) => void>(onChatMessage);
  onChatMessageRef.current = onChatMessage;

  // Toggle microphone
  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    mutedRef.current = next;

    roomRef.current?.localParticipant.setMicrophoneEnabled(!next).catch((err) => {
      console.error("[Voice Orb] Microphone toggle failed:", err);
    });

    if (next) {
      setCallStatus("muted");
      setStatusText("Microphone muted. You can still type below.");
    } else {
      setCallStatus("listening");
      setStatusText("Listening...");
    }
  }, [isMuted]);

  // Typed chat and quick-action chips dispatch to the LiveKit agent
  const handleUserInput = useCallback(async (rawText: string) => {
    const text = rawText.trim();
    const room = roomRef.current;
    if (!text || !room) return;

    try {
      await room.localParticipant.sendText(text, { topic: "lk.chat" });
    } catch (err) {
      console.error("[Voice Orb] Failed to send text to agent:", err);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    mutedRef.current = false;
    speakingRef.current = false;
    setIsMuted(false);
    setCallStatus("greeting");
    setStatusText("Connecting to CallAutomate...");

    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    const setupAudioAnalyser = (micTrack: MediaStreamTrack) => {
      if (cancelled || audioContextRef.current) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        ctx.createMediaStreamSource(new MediaStream([micTrack])).connect(analyser);
      } catch (e) {
        console.warn("[Voice Orb] Could not init AudioContext analyser:", e);
      }
    };

    // Agent state drives the orb: initializing | listening | thinking | speaking
    const applyAgentState = (state?: string) => {
      if (cancelled) return;
      if (state === "speaking") {
        speakingRef.current = true;
        setCallStatus("speaking");
        setStatusText("Sarah is speaking");
      } else if (state === "thinking") {
        speakingRef.current = false;
        setStatusText("Thinking...");
      } else if (state === "listening") {
        speakingRef.current = false;
        setCallStatus(mutedRef.current ? "muted" : "listening");
        setStatusText(mutedRef.current ? "Microphone muted" : "Listening...");
      }
    };

    // Website control: the agent calls this to scroll, fill form, select slot, submit, etc.
    room.localParticipant.registerRpcMethod("orb_action", async (data: RpcInvocationData) => {
      if (!data.callerIdentity || data.callerIdentity === room.localParticipant.identity) {
        throw new RpcError(2, "Unauthorized orb_action caller");
      }

      const caller = room.remoteParticipants.get(data.callerIdentity);
      if (caller && caller.kind !== ParticipantKind.AGENT) {
        throw new RpcError(2, "Unauthorized orb_action caller: caller must be agent");
      }

      let parsed: { name: string; input?: any };
      try {
        parsed = JSON.parse(data.payload);
      } catch (_) {
        throw new RpcError(1, "Bad orb_action payload");
      }
      try {
        const result = await actionHandlerRef.current(parsed.name, parsed.input || {});
        return JSON.stringify(result ?? { ok: true });
      } catch (err) {
        console.error("[Voice Orb] Action failed:", err);
        return JSON.stringify({ ok: false, error: String(err) });
      }
    });

    // Live conversation card: the agent mirrors each turn as {role, text}
    room.registerTextStreamHandler("orb-chat", async (reader) => {
      try {
        const raw = await reader.readAll();
        const msg = JSON.parse(raw) as { role?: string; text?: string };
        if (msg.text) {
          onChatMessageRef.current(msg.role === "user" ? "user" : "agent", msg.text);
        }
      } catch (err) {
        console.warn("[Voice Orb] Invalid orb-chat message:", err);
      }
    });

    room
      .on(RoomEvent.ParticipantConnected, (p) => {
        if (p.kind === ParticipantKind.AGENT) {
          applyAgentState(p.attributes["lk.agent.state"]);
        }
      })
      .on(RoomEvent.ParticipantAttributesChanged, (changed, participant) => {
        if (participant.kind === ParticipantKind.AGENT && "lk.agent.state" in changed) {
          applyAgentState(participant.attributes["lk.agent.state"]);
        }
      })
      .on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.style.display = "none";
          document.body.appendChild(el);
          agentAudioElsRef.current.push(el);
        }
      })
      .on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
      })
      .on(RoomEvent.LocalTrackPublished, (pub) => {
        if (pub.source === Track.Source.Microphone && pub.track?.mediaStreamTrack) {
          setupAudioAnalyser(pub.track.mediaStreamTrack);
        }
      })
      .on(RoomEvent.Disconnected, () => {
        if (cancelled) return;
        speakingRef.current = false;
        setStatusText("Call ended");
      });

    const connect = async () => {
      try {
        const res = await fetch("/api/livekit-token", { method: "POST" });
        if (!res.ok) throw new Error(`Token endpoint returned ${res.status}`);
        const { serverUrl, participantToken } = await res.json();
        if (cancelled) return;

        await room.connect(serverUrl, participantToken);
        if (cancelled) {
          room.disconnect();
          return;
        }

        room.startAudio().catch(() => {});

        // Check if agent is already in the room
        room.remoteParticipants.forEach((p) => {
          if (p.kind === ParticipantKind.AGENT) {
            applyAgentState(p.attributes["lk.agent.state"]);
          }
        });

        setStatusText("Connected. Sarah is joining...");

        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch (_) {
          setStatusText("Microphone permission blocked. You can type in the chat box.");
          return;
        }

        const mic = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack;
        if (mic) {
          setupAudioAnalyser(mic);
        }
      } catch (err) {
        console.error("[Voice Orb] LiveKit connect failed:", err);
        if (!cancelled) {
          setStatusText("Couldn't connect to the voice agent. Please try again.");
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      agentAudioElsRef.current.forEach((el) => el.remove());
      agentAudioElsRef.current = [];
      room.disconnect();
      roomRef.current = null;
      speakingRef.current = false;
      analyserRef.current = null;
      audioDataRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (typeof window !== "undefined") {
        (window as any).mic = 0;
      }
    };
  }, [isOpen]);

  return {
    callStatus,
    statusText,
    isMuted,
    toggleMute,
    handleUserInput,
    speakingRef,
    mutedRef,
    analyserRef,
    audioDataRef,
  };
}
