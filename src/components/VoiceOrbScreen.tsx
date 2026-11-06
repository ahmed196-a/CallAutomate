"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import "./voice-orb.css";
import { useLiveKitVoiceOrb } from "@/hooks/useLiveKitVoiceOrb";
import { getLenis } from "@/components/SmoothScroll";
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

interface ChipAction {
  label: string;
}

const CHIP_ACTIONS: ChipAction[] = [
  { label: "Book a demo meeting" },
  { label: "Calculate my ROI" },
  { label: "Which POS do you support?" },
  { label: "How does the voice agent work?" },
  { label: "AI Ordering Website" },
  { label: "Meta & Instagram Chatbot" },
  { label: "Do I need a new phone number?" },
  { label: "Talk to a human" },
];

const SLOT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SLOT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function VoiceOrbScreen({ isOpen, onClose }: VoiceOrbScreenProps) {
  const [viewMode, setViewMode] = useState<"fullscreen" | "docked">("fullscreen");
  const viewModeRef = useRef<"fullscreen" | "docked">(viewMode);
  viewModeRef.current = viewMode;
  const [, setUserName] = useState<string>("");
  const [inputText, setInputText] = useState<string>("");

  // Refs for visual stage and audio analysis
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const capsRef = useRef<HTMLDivElement | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const hudWaveRef = useRef<HTMLDivElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lvlRef = useRef<number>(0);

  // Robot control reference
  const robotCtlRef = useRef<{
    thinking: (on: boolean) => void;
    mood: (name: string, ms?: number) => void;
    lookAt: (target: any, ms?: number) => void;
    jump: () => void;
  } | null>(null);

  // Form data mirrored from the agent's actions
  const formDataRef = useRef<OrbFormData>({
    name: "",
    restaurant: "",
    contact: "",
    channels: [],
    pos: "",
    slot: "",
  });

  // Captions state management with live streaming word reveal
  const captionCurRef = useRef<{
    who: "agent" | "user";
    p: HTMLParagraphElement;
    renderedWords: string[];
    targetWords: string[];
  } | null>(null);
  const captionStreamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captionIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const caption = useCallback((who: "agent" | "user", text: string) => {
    const caps = capsRef.current;
    if (!caps) return;
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return;

    const userSvg =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';

    if (!captionCurRef.current || captionCurRef.current.who !== who) {
      if (captionStreamTimerRef.current) {
        clearInterval(captionStreamTimerRef.current);
        captionStreamTimerRef.current = null;
      }

      Array.from(caps.children).forEach((el) => {
        if (el.classList.contains("old")) {
          el.classList.add("gone");
          setTimeout(() => el.remove(), 400);
        } else {
          el.classList.add("old");
        }
      });

      const el = document.createElement("div");
      el.className = "vo-cap " + who;
      const p = document.createElement("p");
      p.className = "vo-cap-text";

      if (who === "user") {
        const pill = document.createElement("div");
        pill.className = "vo-cap-pill";
        pill.innerHTML = '<span class="vo-cap-badge">' + userSvg + "</span>";
        pill.appendChild(p);
        el.appendChild(pill);
      } else {
        el.appendChild(p);
      }

      caps.appendChild(el);
      captionCurRef.current = { who, p, renderedWords: [], targetWords: [] };
    }

    const cur = captionCurRef.current;
    cur.targetWords = words;

    const appendWordSpan = (wText: string) => {
      const span = document.createElement("span");
      span.className = "vo-word";
      span.textContent = wText;
      cur.p.appendChild(span);
      cur.p.appendChild(document.createTextNode(" "));
    };

    if (who === "user") {
      if (cur.renderedWords.length !== words.length) {
        cur.p.innerHTML = "";
        words.forEach(appendWordSpan);
        cur.renderedWords = [...words];
      }
    } else {
      // Check if current words match prefix or if new sentence
      if (
        cur.renderedWords.length > words.length ||
        cur.renderedWords.some((w, i) => w !== words[i])
      ) {
        cur.p.innerHTML = "";
        cur.renderedWords = [];
      }

      const revealNextWord = () => {
        if (!captionCurRef.current || captionCurRef.current.who !== "agent") {
          if (captionStreamTimerRef.current) {
            clearInterval(captionStreamTimerRef.current);
            captionStreamTimerRef.current = null;
          }
          return;
        }
        const state = captionCurRef.current;
        if (state.renderedWords.length < state.targetWords.length) {
          const nextWord = state.targetWords[state.renderedWords.length];
          appendWordSpan(nextWord);
          state.renderedWords.push(nextWord);
        } else {
          if (captionStreamTimerRef.current) {
            clearInterval(captionStreamTimerRef.current);
            captionStreamTimerRef.current = null;
          }
        }
      };

      if (cur.renderedWords.length === 0 && cur.targetWords.length > 0) {
        revealNextWord();
      }

      if (!captionStreamTimerRef.current && cur.renderedWords.length < cur.targetWords.length) {
        captionStreamTimerRef.current = setInterval(revealNextWord, 120);
      }
    }

    caps.classList.remove("idle");
    if (captionIdleTimerRef.current) clearTimeout(captionIdleTimerRef.current);
    captionIdleTimerRef.current = setTimeout(() => {
      caps.classList.add("idle");
      captionCurRef.current = null;
      if (captionStreamTimerRef.current) {
        clearInterval(captionStreamTimerRef.current);
        captionStreamTimerRef.current = null;
      }
    }, 7000);
  }, []);

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
        robotCtlRef.current?.lookAt(el, 3500);
        setTimeout(() => el.classList.remove("spot"), 3400);
      }
    }, 120);
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
        match = days.find((d) => d.date.getDay() === wd && d.date > today0);
      } else if (dayNum) {
        match = days.find((d) => d.date.getDate() === +dayNum[1]);
      }

      if (!match) {
        return { ok: false, reason: "day_unavailable", available_days: days.slice(0, 6).map((d) => d.label) };
      }
      candidates = [match];
    }

    const wantTime = (req.time || "").toLowerCase().trim();
    let lastTimes: string[] = [];

    for (const cand of candidates) {
      const before = ts.innerHTML;
      cand.el.click();
      for (let i = 0; i < 10 && ts.innerHTML === before; i++) await sleep(25);
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

  const selectTomorrowSlotInDOM = useCallback(async () => {
    const r = await selectSlotInDOM({ day: "tomorrow" });
    return r.ok ? r.slot : "";
  }, [selectSlotInDOM]);

  const submitBookingFormInDOM = useCallback(() => {
    const form = document.getElementById("kf") as HTMLFormElement;
    if (form) {
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }
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
    onChatMessage: caption,
  });

  // Reset local state when opened
  useEffect(() => {
    if (!isOpen) return;
    setViewMode("fullscreen");
    setUserName("");
    formDataRef.current = {
      name: "",
      restaurant: "",
      contact: "",
      channels: [],
      pos: "",
      slot: "",
    };
  }, [isOpen]);

  // Stop Lenis while voice modal is in fullscreen mode
  useEffect(() => {
    const lenis = getLenis();
    if (isOpen && viewMode === "fullscreen") {
      lenis?.stop();
      return () => {
        lenis?.start();
      };
    }
  }, [isOpen, viewMode]);

  // Three.js 3D Robot Setup & Animation Loop
  useEffect(() => {
    if (!isOpen) return;
    const wrap = canvasWrapRef.current;
    if (!wrap) return;

    // 1. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block";
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0.2, 6);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(2, 4, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-3, 1, 3);
    scene.add(fill);

    const root = new THREE.Group();
    root.scale.setScalar(1.35);
    root.position.y = 0.38;
    scene.add(root);

    // Soft floor shadow
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 128;
    const shadowCtx = shadowCanvas.getContext("2d");
    if (shadowCtx) {
      const g = shadowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(0,0,0,.55)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      shadowCtx.fillStyle = g;
      shadowCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.78;
    root.add(shadowMesh);

    // Speckled chassis texture
    const tc = document.createElement("canvas");
    tc.width = tc.height = 256;
    const tx = tc.getContext("2d");
    if (tx) {
      tx.fillStyle = "#dcdcdc";
      tx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3000; i++) {
        tx.fillStyle = Math.random() > 0.15 ? "#222" : "#ddd";
        tx.beginPath();
        tx.arc(Math.random() * 256, Math.random() * 256, 0.5 + Math.random() * 1.2, 0, 6.283);
        tx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(tc);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 3);
    const shell = new THREE.MeshStandardMaterial({
      color: "#c4c4c4",
      map: tex,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
    });

    const bot = new THREE.Group();
    bot.position.y = -0.3;
    root.add(bot);

    bot.add(new THREE.Mesh(new THREE.SphereGeometry(0.43, 64, 64, 0, Math.PI * 2, Math.PI * 0.15, Math.PI * 0.85), shell));
    const bevel = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.025, 32, 64), shell);
    bevel.rotation.x = Math.PI / 2;
    bevel.position.y = 0.34;
    bot.add(bevel);

    const prof = [
      [0.1, -0.05],
      [0.215, -0.05],
      [0.28, 0.02],
      [0.295, 0.045],
      [0.27, 0.055],
      [0.1, 0.055],
      [0.1, 0.055],
    ].map((p) => new THREE.Vector2(p[0], p[1]));
    const neck = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), shell);
    neck.position.y = 0.38;
    bot.add(neck);

    const head = new THREE.Group();
    head.position.y = 0.6;
    bot.add(head);

    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 64, 64), new THREE.MeshStandardMaterial({ color: "#111", roughness: 1 })));

    const glassMat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color("#38bdf8") },
        power: { value: 3.8 },
        intensity: { value: 1.2 },
      },
      vertexShader:
        "varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vV=-mv.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}",
      fragmentShader:
        "uniform vec3 color;uniform float power;uniform float intensity;varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.-max(dot(normalize(vV),normalize(vN)),0.),power);gl_FragColor=vec4(color,f*intensity);}",
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 64, 64), glassMat));

    // Eyes: two rounded brackets
    function eyePaths() {
      const w = 0.025,
        h = 0.035,
        r = 0.02,
        g = 0.005,
        V = (x: number, y: number) => new THREE.Vector3(x, y, 0);
      const mk = (s: number) => {
        const p = new THREE.CurvePath<THREE.Vector3>();
        p.add(new THREE.LineCurve3(V(-w, s * g), V(-w, s * (h - r))));
        p.add(new THREE.QuadraticBezierCurve3(V(-w, s * (h - r)), V(-w, s * h), V(-w + r, s * h)));
        p.add(new THREE.LineCurve3(V(-w + r, s * h), V(w - r, s * h)));
        p.add(new THREE.QuadraticBezierCurve3(V(w - r, s * h), V(w, s * h), V(w, s * (h - r))));
        p.add(new THREE.LineCurve3(V(w, s * (h - r)), V(w, s * g)));
        return p;
      };
      return [mk(1), mk(-1)];
    }

    const eyeMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const eyes: THREE.Group[] = [];
    [-1, 1].forEach((d) => {
      const gr = new THREE.Group();
      gr.position.set(d * 0.07, -0.02, 0.29);
      gr.rotation.y = d * 0.2;
      gr.scale.setScalar(1.1);
      eyePaths().forEach((p) => gr.add(new THREE.Mesh(new THREE.TubeGeometry(p, 20, 0.0035, 8, false), eyeMat)));
      gr.userData = { bx: d * 0.07, s: { sy: 1, sx: 1, top: 1, bot: 1, oy: 0, ox: 0, rz: 0 } };
      head.add(gr);
      eyes.push(gr);
    });

    // Ears + glowing antenna tip
    const earMat = new THREE.MeshStandardMaterial({ color: "#f0f0f0", roughness: 0.5 });
    const tipMat = new THREE.MeshStandardMaterial({ color: "#ff3366", roughness: 0.2 });
    const tipMats: THREE.MeshStandardMaterial[] = [];
    [-1, 1].forEach((d) => {
      const e = new THREE.Group();
      e.position.set(d * 0.29, 0, 0);
      e.scale.setScalar(1.3);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 32), earMat);
      disc.rotation.z = Math.PI / 2;
      e.add(disc);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.032, 0.008, 16, 32),
        new THREE.MeshStandardMaterial({ color: "#fff", roughness: 0.3 })
      );
      ring.rotation.y = Math.PI / 2;
      ring.position.x = d * 0.012;
      e.add(ring);
      const ant = new THREE.Group();
      ant.position.set(d * 0.015, 0.035, 0);
      ant.rotation.x = -0.4;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.1, 8), new THREE.MeshStandardMaterial({ color: "#d0d0d0" }));
      st.position.y = 0.06;
      ant.add(st);
      const tm = tipMat.clone();
      tm.emissive.set("#ff3366");
      tm.emissiveIntensity = 0.2;
      tipMats.push(tm);
      const tp = new THREE.Mesh(new THREE.SphereGeometry(0.007, 16, 16), tm);
      tp.position.y = 0.11;
      ant.add(tp);
      e.add(ant);
      head.add(e);
    });

    // Eye poses definition
    interface EyeState {
      sy: number;
      sx: number;
      top: number;
      bot: number;
      oy: number;
      ox: number;
      rz: number;
    }
    const E = (o: Partial<EyeState>): EyeState =>
      Object.assign({ sy: 1, sx: 1, top: 1, bot: 1, oy: 0, ox: 0, rz: 0 }, o);
    const _n = E({});
    const _h = E({ sy: 1.3, bot: 0, oy: -0.012 });
    const _c = E({ top: 0, oy: 0.014 });
    const _s = E({ sy: 1.45, sx: 1.2 });
    const POSES: Record<string, [EyeState, EyeState]> = {
      neutral: [_n, _n],
      happy: [_h, _h],
      wink: [_n, _h],
      surprised: [_s, _s],
      closed: [_c, _c],
      think: [E({ sy: 0.8, ox: -0.012, oy: 0.012, rz: 0.1 }), E({ sy: 0.5, ox: -0.012, oy: 0.014, rz: 0.1 })],
    };

    // Pointer tracking
    const ptr = { x: 0, y: 0 };
    const handlePointerMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      if (!r.width || !r.height) return;
      ptr.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ptr.y = Math.max(-1, Math.min(1, -(((e.clientY - r.top) / r.height) * 2 - 1)));
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    // Resize
    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    // Mood & Looking behaviour
    const mood = { name: "neutral", until: 0 };
    const look = { x: 0, y: 0, on: false, t: null as ReturnType<typeof setTimeout> | null };
    let slowBlinkAt = -1e9;
    let tiltUntil = 0;
    let lastBusy = 0;
    let nextIdle = 0;
    const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

    function setMood(name: string, ms = 1500) {
      mood.name = name;
      mood.until = performance.now() + ms;
    }

    function lookAt(t: any, ms = 2500) {
      let x = 0,
        y = 0;
      if (typeof t === "string") {
        x = t === "left" ? -0.85 : t === "right" ? 0.85 : 0;
        y = t === "up" ? 0.7 : t === "down" ? -0.6 : 0.1;
      } else if (t && t.getBoundingClientRect) {
        const r = wrap?.getBoundingClientRect();
        const b = t.getBoundingClientRect();
        if (!r || !r.width || !r.height) return;
        x = clamp1(((b.left + b.width / 2 - r.left) / r.width) * 2 - 1);
        y = clamp1(-(((b.top + b.height / 2 - r.top) / r.height) * 2 - 1));
      } else if (t) {
        x = t.x;
        y = t.y;
      } else {
        look.on = false;
        return;
      }
      look.x = x;
      look.y = y;
      look.on = true;
      if (look.t) clearTimeout(look.t);
      look.t = setTimeout(() => {
        look.on = false;
      }, ms);
    }

    function idleAction() {
      const r = Math.random();
      if (r < 0.4) {
        const s = Math.random() < 0.5 ? -1 : 1;
        lookAt({ x: 0.75 * s, y: (Math.random() - 0.4) * 0.5 }, 1100);
        setTimeout(() => lookAt({ x: -0.6 * s, y: 0.1 }, 900), 1500);
      } else if (r < 0.7) {
        tiltUntil = performance.now() + 1700;
      } else if (r < 0.9) {
        slowBlinkAt = performance.now();
      } else {
        setMood("wink", 900);
      }
    }

    let jumpAt = -1;
    const JUMP_MS = 850;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    function overBot(e: PointerEvent): THREE.Object3D | null {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      ray.setFromCamera(ndc, camera);
      const h = ray.intersectObject(bot, true);
      return h.length ? h[0].object : null;
    }

    const onPointerDown = (e: PointerEvent) => {
      const h = overBot(e);
      if (!h || jumpAt >= 0) return;
      jumpAt = performance.now();
      let o: THREE.Object3D | null = h;
      let isHead = false;
      while (o) {
        if (o === head) {
          isHead = true;
          break;
        }
        o = o.parent;
      }
      setMood(isHead ? "wink" : "happy", 1100);
    };

    const onCanvasPointerMove = (e: PointerEvent) => {
      renderer.domElement.style.cursor = overBot(e) ? "pointer" : "";
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onCanvasPointerMove, { passive: true });

    let isThinking = false;
    robotCtlRef.current = {
      thinking: (on: boolean) => {
        isThinking = on;
      },
      mood: setMood,
      lookAt,
      jump: () => {
        if (jumpAt < 0) jumpAt = performance.now();
      },
    };

    // Observer for .spot highlights on website
    const spotObserver = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        const el = m.target as HTMLElement;
        if (el.classList && el.classList.contains("spot") && !/\bspot\b/.test(m.oldValue || "")) {
          lookAt(el, 3500);
        }
      });
    });
    spotObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
      attributeOldValue: true,
    });

    const L = THREE.MathUtils.lerp;
    const timer = typeof (THREE as any).Timer === "function" ? new (THREE as any).Timer() : null;
    const startTime = performance.now();
    let sc = 1;

    // Main 3D Render Loop
    function loop() {
      animFrameRef.current = requestAnimationFrame(loop);
      if (document.hidden) return;

      if (timer) timer.update();
      const t = timer ? timer.getElapsed() : (performance.now() - startTime) * 0.001;
      const nowMs = performance.now();
      const isSpeaking = speakingRef.current;
      const isMutedNow = mutedRef.current;

      // Audio level calculation
      let targetLvl = 0;
      if (isSpeaking) {
        targetLvl = 0.35 + 0.35 * Math.abs(Math.sin(t * 4.8)) * (0.6 + 0.4 * Math.sin(t * 1.9));
      } else if (analyserRef.current && audioDataRef.current && !isMutedNow) {
        analyserRef.current.getByteFrequencyData(audioDataRef.current as any);
        let sum = 0;
        for (let i = 0; i < audioDataRef.current.length; i++) sum += audioDataRef.current[i];
        targetLvl = Math.min(1, (sum / audioDataRef.current.length / 255) * 2.8);
      } else if (!isMutedNow) {
        targetLvl = 0.08 + 0.04 * Math.sin(t * 2);
      }

      lvlRef.current += (targetLvl - lvlRef.current) * 0.18;
      const lvl = lvlRef.current;

      // Update fullscreen wave bars in callbar
      if (waveRef.current) {
        const bars = waveRef.current.children;
        for (let i = 0; i < bars.length; i++) {
          const idle = isSpeaking ? 0.3 + 0.35 * Math.abs(Math.sin(t * 5 + i * 1.3)) : 0.08;
          const h = 18 + Math.min(1, Math.max(idle, lvl * (1.3 + i * 0.12))) * 36;
          (bars[i] as HTMLElement).style.height = `${h.toFixed(1)}px`;
        }
      }

      // Update docked wave bars (transform: scaleY)
      if (hudWaveRef.current) {
        const hbars = hudWaveRef.current.children;
        for (let i = 0; i < hbars.length; i++) {
          const idle = isSpeaking ? 0.35 + 0.35 * Math.abs(Math.sin(t * 5 + i * 1.3)) : 0.12;
          const scale = 0.25 + Math.min(1, Math.max(idle, lvl * 1.4)) * 0.75;
          (hbars[i] as HTMLElement).style.transform = `scaleY(${scale.toFixed(3)})`;
        }
      }

      // Robot animation
      const tx = look.on ? look.x : ptr.x;
      const ty = look.on ? look.y : ptr.y;
      bot.position.x = L(bot.position.x, tx * 0.5, 0.02);
      const rx = tx - bot.position.x / 2.5;
      bot.rotation.y = L(bot.rotation.y, -rx * 0.95, 0.2);
      bot.rotation.x = L(bot.rotation.x, -ty * 0.25, 0.2);
      bot.rotation.z = L(bot.rotation.z, -rx * 0.15, 0.2);

      head.rotation.y = L(head.rotation.y, rx * 1.8, 0.3);
      head.rotation.x = L(head.rotation.x, -ty * 0.3 - (isThinking ? 0.12 : 0), 0.3);
      head.rotation.z = L(head.rotation.z, isThinking ? -0.2 : tiltUntil > nowMs ? 0.18 : 0, 0.08);

      sc = L(sc, 1 + lvl * 0.035, 0.15);
      let jy = 0,
        jsx = 1,
        jsy = 1;

      if (jumpAt >= 0) {
        const p = (performance.now() - jumpAt) / JUMP_MS;
        if (p >= 1) {
          jumpAt = -1;
        } else if (p < 0.15) {
          const k = p / 0.15;
          jsy = 1 - 0.14 * k;
          jsx = 1 + 0.07 * k;
        } else if (p < 0.85) {
          const q = (p - 0.15) / 0.7;
          const a = Math.sin(Math.PI * q);
          jy = 0.5 * 4 * q * (1 - q);
          jsy = 1 + 0.08 * a;
          jsx = 1 - 0.04 * a;
        } else {
          const a = Math.sin((Math.PI * (p - 0.85)) / 0.15);
          jsy = 1 - 0.12 * a;
          jsx = 1 + 0.06 * a;
        }
      }

      bot.scale.set(sc * jsx, sc * jsy, sc * jsx);
      bot.position.y = -0.3 + jy + 0.43 * (1 - jsy);
      shadowMesh.scale.setScalar(1 - jy * 0.9);
      (shadowMesh.material as THREE.MeshBasicMaterial).opacity = 1 - jy * 0.9;

      // Idle behaviors
      const busy = isSpeaking || isThinking || isMutedNow || jumpAt >= 0 || look.on || mood.until > nowMs;
      if (busy) {
        lastBusy = nowMs;
        nextIdle = nowMs + 1;
      } else if (nowMs - lastBusy > 7000 && nowMs > nextIdle) {
        idleAction();
        nextIdle = nowMs + 6000 + Math.random() * 7000;
      }

      // Eye poses & blinking
      const pn =
        mood.until > nowMs ? mood.name : isMutedNow ? "closed" : isThinking ? "think" : "neutral";
      const P = POSES[pn] || POSES.neutral;
      const bc = t % 3;
      const bl = bc < 0.45 ? Math.max(0.05, 1 - Math.sin((bc / 0.45) * Math.PI)) : 1;
      const sb = (nowMs - slowBlinkAt) / 900;
      const slow = sb >= 0 && sb < 1 ? Math.max(0.05, 1 - Math.sin(sb * Math.PI)) : 1;
      const blink = pn === "closed" || pn === "happy" ? 1 : Math.min(bl, slow);

      eyes.forEach((e, i) => {
        const p = P[i];
        const s = e.userData.s;
        s.sy = L(s.sy, p.sy, 0.2);
        s.sx = L(s.sx, p.sx, 0.2);
        s.oy = L(s.oy, p.oy, 0.2);
        s.ox = L(s.ox, p.ox, 0.2);
        s.rz = L(s.rz, p.rz, 0.2);
        s.top = L(s.top, p.top, 0.25);
        s.bot = L(s.bot, p.bot, 0.25);

        e.scale.set(1.1 * s.sx, 1.1 * s.sy * blink, 1.1);
        e.position.set(e.userData.bx + s.ox, -0.02 + s.oy, 0.29);
        e.rotation.z = s.rz;
        if (e.children[0]) {
          e.children[0].scale.y = Math.max(0.001, s.top);
          e.children[0].visible = s.top > 0.03;
        }
        if (e.children[1]) {
          e.children[1].scale.y = Math.max(0.001, s.bot);
          e.children[1].visible = s.bot > 0.03;
        }
      });

      // Glass and antenna tip glow
      const gt = isMutedNow ? 0.7 : isThinking ? 1.15 + 0.45 * Math.sin(t * 5) : 1.1 + lvl * 1.5;
      glassMat.uniforms.intensity.value = L(glassMat.uniforms.intensity.value, gt, 0.2);
      glassMat.uniforms.color.value.set(isMutedNow ? "#ef4444" : "#38bdf8");

      tipMats.forEach((m, i) => {
        m.emissiveIntensity = isThinking
          ? 0.1 + Math.max(0, Math.sin(t * 7 - i * 2.4)) * 1.6
          : 0.2 + lvl * 1.4;
      });

      if (viewModeRef.current !== "docked") {
        renderer.render(scene, camera);
      }
    }

    loop();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (captionStreamTimerRef.current) clearInterval(captionStreamTimerRef.current);
      if (captionIdleTimerRef.current) clearTimeout(captionIdleTimerRef.current);
      if (look.t) clearTimeout(look.t);
      spotObserver.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onCanvasPointerMove);

      // Clean disposal of Three.js resources
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => {
                if ((mat as any).map) (mat as any).map.dispose();
                mat.dispose();
              });
            } else {
              if ((mesh.material as any).map) (mesh.material as any).map.dispose();
              mesh.material.dispose();
            }
          }
        }
      });
      shadowTexture.dispose();
      tex.dispose();

      if (timer && typeof (timer as any).dispose === "function") {
        (timer as any).dispose();
      }
      renderer.dispose();
      if (typeof renderer.forceContextLoss === "function") {
        renderer.forceContextLoss();
      }
      wrap.innerHTML = "";
    };
  }, [isOpen, analyserRef, audioDataRef, mutedRef, speakingRef]);

  // Sync agent state changes to robot animations
  useEffect(() => {
    if (callStatus === "speaking") {
      robotCtlRef.current?.thinking(false);
      robotCtlRef.current?.mood("happy", 1200);
    } else if (statusText.toLowerCase().includes("thinking")) {
      robotCtlRef.current?.thinking(true);
    } else {
      robotCtlRef.current?.thinking(false);
    }
  }, [callStatus, statusText]);

  if (!isOpen) return null;

  return (
    <>
      {/* 1. FULLSCREEN STUDIO VOICE SCREEN */}
      <div className={`vo-fullscreen ${viewMode === "docked" ? "hide" : ""}`} id="full" data-lenis-prevent>
        <div className="vo-bg-text" aria-hidden="true">
          CALLAUTOMATE
        </div>

        {/* Header */}
        <header className="vo-screen-header">
          <div className="vo-header-left">
            <div className="vo-brand">
              <img src="/logo-removebg-preview.png" alt="CallAutomate" className="vo-brand-logo" />
              <span>CallAutomate</span>
            </div>
            <span className="vo-session-pill">
              <i /> Live session
            </span>
          </div>

          <div className="vo-header-right">
            <button className="vo-nav-btn end" title="End call" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 4 .65 2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A19.93 19.93 0 0 1 3 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2 12.84 12.84 0 0 0 .65 4 2 2 0 0 1-.45 2.11L8.93 9.4" />
                <line x1="23" y1="1" x2="1" y2="23" />
              </svg>
              <span>End Call</span>
            </button>
          </div>
        </header>

        {/* Main Stage */}
        <main className="vo-screen-body" data-lenis-prevent>
          <div className="vo-stage">
            <div ref={canvasWrapRef} className="vo-stage-canvas" id="canvasWrap" />
            <div ref={capsRef} className="vo-captions idle" id="caps" aria-live="polite" />

            <div className="vo-status-block">
              <h2 className="vo-status-title" id="status">
                {isMuted ? "Muted" : callStatus === "speaking" ? "Speaking..." : statusText.toLowerCase().includes("thinking") ? "Thinking..." : "Listening..."}
              </h2>
              <p className="vo-status-sub" id="statusSub">
                {isMuted
                  ? "Microphone muted • Type a message below"
                  : statusText && statusText !== "Listening..." && statusText !== "Microphone muted"
                  ? statusText
                  : "Your AI agent is ready to help • Speak or type anytime"}
              </p>
            </div>

            {/* Call Controls Bar with Integrated Chat Input */}
            <div className="vo-callbar">
              <button
                type="button"
                className={`vo-round-btn ${isMuted ? "muted" : ""}`}
                id="muteBtn"
                aria-label={isMuted ? "Unmute" : "Mute"}
                onClick={toggleMute}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" id="micIcon">
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

              <div ref={waveRef} className="vo-wave" id="wave">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              {/* Integrated Chat Box */}
              <form
                className="vo-callbar-chat"
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = inputText.trim();
                  if (!text) return;
                  caption("user", text);
                  robotCtlRef.current?.thinking(true);
                  handleUserInput(text);
                  setInputText("");
                }}
              >
                <input
                  type="text"
                  className="vo-callbar-input"
                  placeholder="Type a message or speak..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  aria-label="Type a message to the agent"
                />
                <button
                  type="submit"
                  className={`vo-callbar-send-btn ${inputText.trim() ? "active" : ""}`}
                  disabled={!inputText.trim()}
                  aria-label="Send message"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>

              <button type="button" className="vo-round-btn end" aria-label="End call" onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </main>

        {/* Footer Quick Action Chips */}
        <footer className="vo-screen-footer">
          <div className="vo-chips-row" id="chips" data-lenis-prevent>
            {CHIP_ACTIONS.map((item, idx) => (
              <button
                key={idx}
                className="vo-action-chip"
                onClick={() => {
                  caption("user", item.label);
                  robotCtlRef.current?.thinking(true);
                  handleUserInput(item.label);
                }}
              >
                <span className="vo-chip-label">{item.label}</span>
              </button>
            ))}
          </div>
        </footer>
      </div>

      {/* 2. DOCKED FLOATING HUD */}
      <div className={`vo-docked-hud ${viewMode === "fullscreen" ? "hide" : ""}`} id="hud">
        <div
          className="vo-docked-left"
          id="undock"
          style={{ cursor: "pointer" }}
          onClick={() => setViewMode("fullscreen")}
        >
          <div className="vo-mini-orb-link">
            <img
              src="/logo-removebg-preview.png"
              alt="CallAutomate"
              className="vo-brand-logo"
              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "contain" }}
            />
          </div>
          <div className="vo-docked-info">
            <span className="vo-docked-title">CallAutomate</span>
            <span className="vo-docked-sub" id="hudSub">
              {isMuted ? "Muted" : callStatus === "speaking" ? "Speaking..." : statusText.toLowerCase().includes("thinking") ? "Thinking..." : "Listening..."}
            </span>
          </div>
        </div>

        <div ref={hudWaveRef} className="vo-docked-wave" id="hudWave">
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
            title="Expand"
            id="expand"
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
    </>
  );
}
