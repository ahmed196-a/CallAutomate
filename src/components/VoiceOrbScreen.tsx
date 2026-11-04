"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import "./voice-orb.css";
import { useLiveKitVoiceOrb } from "@/hooks/useLiveKitVoiceOrb";
import {
  executeOrbAction,
  type OrbFormData,
  type SlotRequest,
  type SlotResult,
} from "@/lib/livekit/orb-actions";

interface VoiceOrbScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  sender: "agent" | "user";
  text: string;
  time?: string;
}

interface ChipAction {
  label: string;
  icon: "calendar" | "chart" | "headphones" | "list" | "bot" | "instagram" | "phone" | "user";
}

const CHIP_ACTIONS: ChipAction[] = [
  { label: "Book a demo meeting", icon: "calendar" },
  { label: "Calculate my ROI", icon: "chart" },
  { label: "Which POS do you support?", icon: "headphones" },
  { label: "How does the voice agent work?", icon: "list" },
  { label: "AI Ordering Website", icon: "bot" },
  { label: "Meta & Instagram Chatbot", icon: "instagram" },
  { label: "Do I need a new phone number?", icon: "phone" },
  { label: "Talk to a human", icon: "user" },
];

function renderChipIcon(type: ChipAction["icon"]) {
  switch (type) {
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case "headphones":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      );
    case "list":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case "bot":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8.01" y2="16" />
          <line x1="16" y1="16" x2="16.01" y2="16" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );
    case "phone":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
  }
}

const LOGO_SRC = "/logo-removebg-preview.png";

const SLOT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SLOT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function VoiceOrbScreen({ isOpen, onClose }: VoiceOrbScreenProps) {
  const [viewMode, setViewMode] = useState<"fullscreen" | "docked">("fullscreen");
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  // Refs for visual stage and audio analysis
  const orbWrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveBarsRef = useRef<HTMLDivElement | null>(null);
  const dockedWaveBarsRef = useRef<HTMLDivElement | null>(null);
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lvlRef = useRef<number>(0);

  // Form data mirrored from the agent's actions
  const formDataRef = useRef<OrbFormData>({
    name: "",
    restaurant: "",
    contact: "",
    channels: [],
    pos: "",
    slot: "",
  });

  // Scroll to section with spotlight
  const navigateTo = useCallback((id: string) => {
    setViewMode("docked");
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: id.startsWith("p-") ? "center" : "start",
          inline: "nearest",
        });
        el.classList.add("spot");
        setTimeout(() => el.classList.remove("spot"), 3400);
      }
    }, 120);
  }, []);

  // Add message to chat log
  const addMessage = useCallback((sender: "agent" | "user", text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setMessages((prev) => [...prev, { sender, text, time }]);
    setTimeout(() => {
      if (chatLogRef.current) {
        chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
      }
    }, 60);
  }, []);

  // Form filling helpers for #kf
  const fillDOMField = useCallback((id: string, value: string) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
    if (el) {
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, []);

  const selectPOSInDOM = useCallback((posName: string) => {
    const sel = document.getElementById("k-p") as HTMLSelectElement;
    if (!sel || !posName) return;
    const lower = posName.toLowerCase();
    for (let i = 0; i < sel.options.length; i++) {
      const optText = sel.options[i].text.toLowerCase();
      if (optText === lower || (optText && lower.includes(optText)) || (lower && optText.includes(lower))) {
        sel.selectedIndex = i;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
    }
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].text.toLowerCase().includes("other")) {
        sel.selectedIndex = i;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        const ko = document.getElementById("k-o") as HTMLInputElement;
        if (ko) {
          ko.value = posName;
          ko.dispatchEvent(new Event("input", { bubbles: true }));
        }
        return;
      }
    }
  }, []);

  const syncChannelsInDOM = useCallback((requestedLabels: string[]) => {
    const kc = document.getElementById("kc");
    if (!kc) return;
    const requestedNormalized = requestedLabels.map((s) => s.trim().toLowerCase());
    Array.from(kc.children).forEach((child) => {
      const btn = child as HTMLButtonElement;
      const label = (btn.textContent || "").trim().toLowerCase();
      const shouldBePressed = requestedNormalized.includes(label);
      const isPressed = btn.getAttribute("aria-pressed") === "true";
      if (shouldBePressed !== isPressed) {
        btn.click();
      }
    });
  }, []);

  const selectSlotInDOM = useCallback(async (req: SlotRequest = {}): Promise<SlotResult> => {
    const ds = document.getElementById("ds");
    const ts = document.getElementById("ts");
    if (!ds || !ts) return { ok: false, reason: "no_form" };

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    type DayCard = { el: HTMLButtonElement; date: Date; label: string };
    const days: DayCard[] = Array.from(ds.querySelectorAll<HTMLButtonElement>(".dc")).flatMap((el) => {
      const num = parseInt(el.querySelector("b")?.textContent || "", 10);
      const text = el.textContent || "";
      const mon = SLOT_MONTHS.findIndex((m) => text.includes(m));
      if (!num || mon < 0) return [];
      let date = new Date(today0.getFullYear(), mon, num);
      if (date < today0) date = new Date(today0.getFullYear() + 1, mon, num);
      return [{ el, date, label: `${SLOT_WEEKDAYS[date.getDay()]} ${num} ${SLOT_MONTHS[mon]}` }];
    });
    if (!days.length) return { ok: false, reason: "no_form" };

    // ---- which day ----
    const want = (req.day || "").toLowerCase().trim();
    const sameDay = (a: Date, b: Date) => a.getTime() === b.getTime();
    let candidates: DayCard[] = days;

    if (want && want !== "first_available") {
      let match: DayCard | undefined;
      const iso = want.match(/(\d{4})-(\d{2})-(\d{2})/);
      const monIdx = SLOT_MONTHS.findIndex((m) => want.includes(m.toLowerCase()));
      const dayNum = want.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      const wd = SLOT_WEEKDAYS.findIndex((w) => new RegExp(`\\b${w.toLowerCase()}`).test(want));

      if (want.includes("today")) {
        match = days.find((d) => sameDay(d.date, today0));
      } else if (want.includes("tomorrow")) {
        const t = new Date(today0);
        t.setDate(t.getDate() + 1);
        match = days.find((d) => sameDay(d.date, t));
      } else if (iso) {
        match = days.find(
          (d) => d.date.getFullYear() === +iso[1] && d.date.getMonth() === +iso[2] - 1 && d.date.getDate() === +iso[3]
        );
      } else if (monIdx >= 0 && dayNum) {
        match = days.find((d) => d.date.getMonth() === monIdx && d.date.getDate() === +dayNum[1]);
      } else if (wd >= 0) {
        // a bare weekday means the next one, not today
        match = days.find((d) => d.date.getDay() === wd && d.date > today0);
      } else if (dayNum) {
        match = days.find((d) => d.date.getDate() === +dayNum[1]);
      }

      if (!match) {
        return { ok: false, reason: "day_unavailable", available_days: days.slice(0, 6).map((d) => d.label) };
      }
      candidates = [match];
    }

    // ---- which time ----
    const wantTime = (req.time || "").toLowerCase().trim();
    let lastTimes: string[] = [];

    for (const cand of candidates) {
      const before = ts.innerHTML;
      cand.el.click();
      for (let i = 0; i < 10 && ts.innerHTML === before; i++) await sleep(25); // wait for the slot list to re-render
      await sleep(30);

      const open = Array.from(ts.querySelectorAll<HTMLButtonElement>(".tsl")).filter((b) => !b.disabled);
      lastTimes = open.map((b) => (b.textContent || "").trim());
      const pick = wantTime
        ? open.find((b) => (b.textContent || "").trim().toLowerCase() === wantTime)
        : open[0];

      if (pick) {
        pick.click();
        await sleep(60);
        const timeText = (pick.textContent || "").trim();
        const psum = (document.getElementById("psum")?.textContent || "").replace(/^✓\s*/, "").trim();
        const slot = psum && psum.toLowerCase().includes(timeText.toLowerCase()) ? psum : `${cand.label} at ${timeText}`;
        formDataRef.current.slot = slot;
        return { ok: true, slot };
      }
    }
    return { ok: false, reason: "time_unavailable", available_times: lastTimes };
  }, []);

  // Keep the old name working if anything else calls it
  const selectTomorrowSlotInDOM = useCallback(
    async () => {
      const r = await selectSlotInDOM({ day: "tomorrow" });
      return r.ok ? r.slot : "";
    },
    [selectSlotInDOM]
  );

  const submitBookingFormInDOM = useCallback(() => {
    const form = document.getElementById("kf") as HTMLFormElement;
    if (form) {
      form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  }, []);

  const handleROIFromTool = useCallback(
    ({ missed_calls_per_week, avg_order_value }: { missed_calls_per_week?: number; avg_order_value?: number }) => {
      navigateTo("roi");

      const cw = document.getElementById("cw") as HTMLInputElement;
      const ca = document.getElementById("ca") as HTMLInputElement;
      const cc = document.getElementById("cc") as HTMLInputElement;

      if (missed_calls_per_week !== undefined && missed_calls_per_week !== null && cw) {
        cw.value = String(missed_calls_per_week);
        cw.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (avg_order_value !== undefined && avg_order_value !== null && ca) {
        ca.value = String(avg_order_value);
        ca.dispatchEvent(new Event("input", { bubbles: true }));
      }

      const currentCalls = cw ? +cw.value : 40;
      const currentAov = ca ? +ca.value : 28;
      const currentIntent = cc ? +cc.value / 100 : 0.6;

      const orders = Math.round(currentCalls * 4.333 * currentIntent);
      const monthly = Math.round(orders * currentAov);
      const annual = monthly * 12;

      return `With ${currentCalls} missed calls a week and an average order of ${currentAov} euros, you'd recover about ${orders} orders a month, totaling roughly €${monthly.toLocaleString()} monthly and €${annual.toLocaleString()} annually. You can see the live breakdown on the calculator.`;
    },
    [navigateTo]
  );

  // LiveKit RPC Action Runner
  const handleAction = useCallback(
    async (name: string, input: any) => {
      return executeOrbAction(name, input, {
        navigateTo,
        fillDOMField,
        selectPOSInDOM,
        syncChannelsInDOM,
        selectSlotInDOM,
        selectTomorrowSlotInDOM,
        submitBookingFormInDOM,
        handleROIFromTool,
        setUserName,
        formDataRef,
        onClose,
      });
    },
    [
      navigateTo,
      fillDOMField,
      selectPOSInDOM,
      syncChannelsInDOM,
      selectSlotInDOM,
      selectTomorrowSlotInDOM,
      submitBookingFormInDOM,
      handleROIFromTool,
      onClose,
    ]
  );

  // LiveKit WebRTC Voice Orb Hook
  const {
    callStatus,
    statusText,
    isMuted,
    toggleMute,
    handleUserInput,
    speakingRef,
    mutedRef,
    analyserRef,
    audioDataRef,
  } = useLiveKitVoiceOrb({
    isOpen,
    onAction: handleAction,
    onChatMessage: addMessage,
  });

  // Reset local state when opened
  useEffect(() => {
    if (!isOpen) return;
    setViewMode("fullscreen");
    setUserName("");
    setMessages([]);
    formDataRef.current = {
      name: "",
      restaurant: "",
      contact: "",
      channels: [],
      pos: "",
      slot: "",
    };
  }, [isOpen]);

  // Orb Animation Loop & Mouse Parallax
  useEffect(() => {
    if (!isOpen) return;

    const SZ = 320;
    let cachedCanvas: HTMLCanvasElement | null = null;
    let cachedCtx: CanvasRenderingContext2D | null = null;
    let cachedHl: CanvasGradient | null = null;

    const PALETTE = {
      speaking: ["#e6fbff", "#7be0ff", "#2e8fed", "#16318a"],
      listening: ["#dbe8ff", "#6aa5ff", "#2e73ed", "#16318a"],
      idle: ["#dbe8ff", "#6aa5ff", "#2e73ed", "#16318a"],
    };

    const startTime = performance.now();

    const render = (now: number) => {
      const t = (now - startTime) / 1000;

      // Audio level calculation
      let targetLvl = 0;
      if (speakingRef.current) {
        targetLvl = 0.35 + 0.35 * Math.abs(Math.sin(t * 4.8)) * (0.6 + 0.4 * Math.sin(t * 1.9));
      } else if (analyserRef.current && audioDataRef.current && !mutedRef.current) {
        analyserRef.current.getByteFrequencyData(audioDataRef.current as any);
        let sum = 0;
        for (let i = 0; i < audioDataRef.current.length; i++) sum += audioDataRef.current[i];
        targetLvl = Math.min(1, (sum / audioDataRef.current.length / 255) * 2.8);
      } else if (!mutedRef.current) {
        targetLvl = 0.08 + 0.04 * Math.sin(t * 2);
      }

      lvlRef.current += (targetLvl - lvlRef.current) * 0.18;
      const lvl = lvlRef.current;
      if (typeof window !== "undefined") {
        (window as any).mic = lvl;
      }

      if (orbWrapRef.current) {
        orbWrapRef.current.style.setProperty("--lvl", lvl.toFixed(3));
      }

      const canvas = canvasRef.current;
      if (canvas !== cachedCanvas) {
        cachedCanvas = canvas;
        if (canvas) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = SZ * dpr;
          canvas.height = SZ * dpr;
          cachedCtx = canvas.getContext("2d");
          if (cachedCtx) {
            cachedCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const c = SZ / 2;
            cachedHl = cachedCtx.createRadialGradient(c - 36, c - 46, 2, c - 36, c - 46, 75);
            cachedHl.addColorStop(0, "rgba(255, 255, 255, 0.58)");
            cachedHl.addColorStop(1, "rgba(255, 255, 255, 0)");
          }
        } else {
          cachedCtx = null;
          cachedHl = null;
        }
      }

      const ctx = cachedCtx;
      if (ctx) {
        ctx.clearRect(0, 0, SZ, SZ);
        const amp = 0.038 + lvl * 0.22;
        const R = 104 * (1 + lvl * 0.12);
        const pts = 72;
        const c = SZ / 2;

        ctx.beginPath();
        for (let i = 0; i <= pts; i++) {
          const a = (i / pts) * Math.PI * 2;
          const n =
            Math.sin(a * 3 + t * 1.4) * 0.5 +
            Math.sin(a * 5 - t * 1.9) * 0.3 +
            Math.sin(a * 2 + t * 0.9) * 0.45;
          const r = R * (1 + amp * n);
          const x = c + Math.cos(a) * r;
          const y = c + Math.sin(a) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();

        const pal = speakingRef.current ? PALETTE.speaking : PALETTE.listening;
        const grad = ctx.createRadialGradient(c - 34, c - 44, 8, c, c, R * 1.22);
        grad.addColorStop(0, pal[0]);
        grad.addColorStop(0.35, pal[1]);
        grad.addColorStop(0.75, pal[2]);
        grad.addColorStop(1, pal[3]);

        ctx.shadowColor = "rgba(46, 115, 237, 0.75)";
        ctx.shadowBlur = 40 + lvl * 55;
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Specular highlight (using cached gradient)
        if (cachedHl) {
          ctx.fillStyle = cachedHl;
          ctx.fill();
        }
      }

      // Fullscreen waveform bars
      if (waveBarsRef.current) {
        const bars = waveBarsRef.current.querySelectorAll("span");
        bars.forEach((b, i) => {
          const idle = speakingRef.current ? 0.3 + 0.35 * Math.abs(Math.sin(t * 5 + i * 1.3)) : 0.08;
          const v = Math.min(1, Math.max(idle, lvl * (1.3 + i * 0.12)));
          (b as HTMLElement).style.height = `${18 + v * 36}px`;
        });
      }

      // Docked waveform bars
      if (dockedWaveBarsRef.current) {
        const bars = dockedWaveBarsRef.current.querySelectorAll("span");
        bars.forEach((b, i) => {
          const idle = speakingRef.current ? 0.35 + 0.35 * Math.abs(Math.sin(t * 5 + i * 1.3)) : 0.12;
          const v = Math.min(1, Math.max(idle, lvl * 1.4));
          const scale = 0.25 + v * 0.75;
          (b as HTMLElement).style.transform = `scaleY(${scale.toFixed(3)})`;
        });
      }

      if (document.hidden) {
        animFrameRef.current = null;
        return;
      }
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      } else if (!animFrameRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handlePointerMove = (e: PointerEvent) => {
      if (orbWrapRef.current) {
        const r = orbWrapRef.current.getBoundingClientRect();
        const mx = ((e.clientX - r.left) / r.width - 0.5).toFixed(3);
        const my = ((e.clientY - r.top) / r.height - 0.5).toFixed(3);
        orbWrapRef.current.style.setProperty("--mx", mx);
        orbWrapRef.current.style.setProperty("--my", my);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isOpen, analyserRef, audioDataRef, mutedRef, speakingRef]);

  // Form submit for text chat
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const val = textInput;
    setTextInput("");
    handleUserInput(val);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 1. FULL-SCREEN INTERACTIVE VOICE EXPERIENCE */}
      {viewMode === "fullscreen" && (
        <div className="vo-fullscreen">
          {/* Top Navbar Header */}
          <header className="vo-screen-header">
            <div className="vo-header-left">
              <div className="vo-brand">
                <img src={LOGO_SRC} alt="CallAutomate" className="vo-brand-img" />
                <span>CallAutomate</span>
              </div>
              <div className="vo-header-divider" />
              <span className="vo-session-pill">
                <i /> {userName && userName.trim() ? `Live Session · ${userName.trim()}` : "Live AI Voice Session"}
              </span>
            </div>

            <div className="vo-header-right">
              <button
                className="vo-nav-btn view"
                title="View website while staying on call"
                onClick={() => setViewMode("docked")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>View Website</span>
              </button>

              <button className="vo-nav-btn end" title="End call" onClick={onClose}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 4 .65 2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A19.93 19.93 0 0 1 3 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2 12.84 12.84 0 0 0 .65 4 2 2 0 0 1-.45 2.11L8.93 9.4" />
                  <line x1="23" y1="1" x2="1" y2="23" />
                </svg>
                <span>End Call</span>
              </button>
            </div>
          </header>

          {/* Main Body Grid: Left = Orb + Controls, Right = Live Conversation Card */}
          <main className="vo-screen-body">
            <div className="vo-orb-column">
              <div ref={orbWrapRef} className="vo-orb-wrapper">
                <div className="vo-orbital-ring">
                  <span className="vo-orbit-dot dot-1" />
                  <span className="vo-orbit-dot dot-2" />
                  <span className="vo-orbit-dot dot-3" />
                </div>
                <div className="vo-orb-glow" />
                <canvas ref={canvasRef} className="vo-orb-canvas" width={320} height={320} />
                <div className="vo-orb-center-wave" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div className="vo-status-block">
                <h2 className="vo-status-title">
                  {callStatus === "speaking" ? "Speaking..." : callStatus === "muted" ? "Muted" : "Listening..."}
                </h2>
                <p className="vo-status-sub">
                  {statusText && statusText !== "Listening..." && statusText !== "Microphone muted"
                    ? statusText
                    : "Your AI agent is ready to help"}
                </p>
              </div>

              {/* Call Controls Bar */}
              <div className="vo-callbar">
                <button
                  className={`vo-round-btn ${isMuted ? "muted" : ""}`}
                  title={isMuted ? "Unmute microphone" : "Mute microphone"}
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    {isMuted ? (
                      <>
                        <line x1="1" y1="1" x2="23" y2="23" />
                        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </>
                    ) : (
                      <>
                        <rect x="9" y="3" width="6" height="12" rx="3" />
                        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                      </>
                    )}
                  </svg>
                </button>

                <div ref={waveBarsRef} className="vo-wave" aria-label="Audio wave">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <button className="vo-round-btn end" title="End call" onClick={onClose} aria-label="End call">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right Area: Embedded Live Conversation Box */}
            <div className="vo-chat-column">
              <div className="vo-chat-card">
                <div className="vo-chat-card-header">
                  <div className="vo-chat-title">
                    <span className="vo-live-dot" />
                    <span>Live conversation</span>
                  </div>
                  <span className="vo-agent-badge">AI Agent</span>
                </div>

                <div ref={chatLogRef} className="vo-chat-messages">
                  {messages.map((m, i) => (
                    <div key={i} className={`vo-chat-row ${m.sender}`}>
                      {m.sender === "agent" && (
                        <div className="vo-avatar agent">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="10" rx="2" />
                            <circle cx="12" cy="5" r="2" />
                            <path d="M12 7v4" />
                            <line x1="8" y1="16" x2="8.01" y2="16" />
                            <line x1="16" y1="16" x2="16.01" y2="16" />
                          </svg>
                        </div>
                      )}

                      <div className="vo-bubble-wrap">
                        <div className={`vo-bubble ${m.sender}`}>
                          {m.text}
                        </div>
                        <span className="vo-bubble-time">{m.time || "2:14 PM"}</span>
                      </div>

                      {m.sender === "user" && (
                        <div className="vo-avatar user">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Speaking indicator */}
                  {callStatus === "speaking" && (
                    <div className="vo-chat-row agent typing">
                      <div className="vo-avatar agent">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="10" rx="2" />
                          <circle cx="12" cy="5" r="2" />
                          <path d="M12 7v4" />
                          <line x1="8" y1="16" x2="8.01" y2="16" />
                          <line x1="16" y1="16" x2="16.01" y2="16" />
                        </svg>
                      </div>
                      <div className="vo-bubble-wrap">
                        <div className="vo-bubble agent typing-dots">
                          <span />
                          <span />
                          <span />
                        </div>
                        <span className="vo-bubble-time">Speaking</span>
                      </div>
                    </div>
                  )}
                </div>

                <form className="vo-chat-card-input" onSubmit={handleChatSubmit}>
                  <input
                    type="text"
                    placeholder="Or type a question here..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />
                  <button type="submit" aria-label="Send message">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>
          </main>

          {/* Quick Actions / Chips Row */}
          <footer className="vo-screen-footer">
            <div className="vo-quick-header">
              <div className="vo-quick-title">
                <svg className="vo-sparkle-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
                </svg>
                <span>Quick actions</span>
              </div>
              <span className="vo-quick-sub">Try these or ask your own question</span>
            </div>

            <div className="vo-chips-row">
              {CHIP_ACTIONS.map((item, idx) => (
                <button
                  key={idx}
                  className="vo-action-chip"
                  onClick={() => handleUserInput(item.label)}
                >
                  <span className="vo-chip-icon">{renderChipIcon(item.icon)}</span>
                  <span className="vo-chip-label">{item.label}</span>
                  <svg className="vo-chip-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          </footer>
        </div>
      )}

      {/* 2. DOCKED FLOATING HUD (When navigating website) */}
      {viewMode === "docked" && (
        <div className="vo-docked-hud">
          <div className="vo-docked-left" onClick={() => setViewMode("fullscreen")} style={{ cursor: "pointer" }}>
            <div className="vo-mini-orb-link">
              <img src={LOGO_SRC} alt="CallAutomate" />
            </div>
            <div className="vo-docked-info">
              <span className="vo-docked-title">
                CallAutomate {userName && userName.trim() ? `· ${userName.trim()}` : ""}
              </span>
              <span className="vo-docked-sub">{statusText}</span>
            </div>
          </div>

          <div ref={dockedWaveBarsRef} className="vo-docked-wave">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="vo-docked-controls">
            <button
              className="vo-docked-btn"
              title={isMuted ? "Unmute" : "Mute"}
              onClick={toggleMute}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isMuted ? (
                  <>
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  </>
                ) : (
                  <>
                    <rect x="9" y="3" width="6" height="12" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                  </>
                )}
              </svg>
            </button>

            <button
              className="vo-docked-btn"
              title="Expand to Full Screen"
              onClick={() => setViewMode("fullscreen")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>

            <button className="vo-docked-btn end" title="End call" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
