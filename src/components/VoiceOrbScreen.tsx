"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import "./voice-orb.css";

interface VoiceOrbScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  sender: "agent" | "user";
  text: string;
}

const DEFAULT_CHIPS = [
  "Book a demo meeting",
  "Calculate my ROI",
  "Which POS do you support?",
  "Tell me about WhatsApp",
  "How does the voice agent work?",
  "AI Ordering Website",
  "Meta & Instagram Chatbot",
  "Do I need a new phone number?",
  "Talk to a human",
];

const LOGO_SRC = "/logo.png";

export default function VoiceOrbScreen({ isOpen, onClose }: VoiceOrbScreenProps) {
  const [viewMode, setViewMode] = useState<"fullscreen" | "docked">("fullscreen");
  const [callStatus, setCallStatus] = useState<"greeting" | "listening" | "speaking" | "muted">("greeting");
  const [statusText, setStatusText] = useState<string>("Connecting to CallAutomate...");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [isChatMinimized, setIsChatMinimized] = useState<boolean>(false);

  // Refs for audio, speech recognition & synthesis
  const orbWrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveBarsRef = useRef<HTMLDivElement | null>(null);
  const dockedWaveBarsRef = useRef<HTMLDivElement | null>(null);
  const chatLogRef = useRef<HTMLDivElement | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const activeRef = useRef<boolean>(false);
  const speakingRef = useRef<boolean>(false);
  const mutedRef = useRef<boolean>(false);
  const sayIdRef = useRef<number>(0);
  const sayWatchdogRef = useRef<any>(null);

  // LLM conversation history and input ref for avoiding stale closure
  const historyRef = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const handleInputRef = useRef<(t: string) => void>(() => {});

  // Server state tracking
  const stageRef = useRef<string>("name");
  const viewedRef = useRef<string[]>([]);

  // Form filling state machine
  const formStageRef = useRef<"idle" | "name" | "restaurant" | "contact" | "channels" | "pos" | "time" | "confirm">("idle");
  const formDataRef = useRef<{
    name: string;
    restaurant: string;
    contact: string;
    channels: string[];
    pos: string;
    slot: string;
  }>({
    name: "",
    restaurant: "",
    contact: "",
    channels: [],
    pos: "",
    slot: "",
  });

  // Level smoothing
  const lvlRef = useRef<number>(0);

  // Scroll to section with spotlight
  const navigateTo = useCallback((id: string) => {
    setViewMode("docked");
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: id.startsWith("p-") ? "center" : "start" });
        el.classList.add("spot");
        setTimeout(() => el.classList.remove("spot"), 3400);
      }
    }, 120);
  }, []);

  // Female voice selection
  const getFemaleVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return null;

    const isEnglish = (v: SpeechSynthesisVoice) => /^en/i.test(v.lang);
    const isMale = (v: SpeechSynthesisVoice) =>
      /\b(male|david|guy|mark|christopher|eric|george|brian|richard|steffan|roger|ryan|andrew|adam|steve|john|charles|paul|michael|james|alex|fred|daniel|oliver|thomas|william)\b/i.test(
        v.name
      );

    const enFemale = voices.filter((v) => isEnglish(v) && !isMale(v));

    const preferredPatterns = [
      /jenny.*natural/i,
      /aria.*natural/i,
      /ava.*natural/i,
      /sonia.*natural/i,
      /libby.*natural/i,
      /samantha/i,
      /google.*uk.*female/i,
      /google.*female/i,
      /google.*us/i,
      /zira/i,
      /female/i,
    ];

    for (const pattern of preferredPatterns) {
      const match = enFemale.find((v) => pattern.test(v.name));
      if (match) return match;
    }

    return enFemale[0] || voices.find(isEnglish) || voices[0] || null;
  }, []);

  // Speech Output Function
  const say = useCallback(
    (text: string, onDone?: () => void) => {
      if (!activeRef.current) return;
      const id = ++sayIdRef.current;
      clearTimeout(sayWatchdogRef.current);
      speakingRef.current = true;
      setCallStatus("speaking");
      setStatusText(text.length > 95 ? text.slice(0, 92) + "..." : text);

      let finished = false;
      const finish = () => {
        if (finished || id !== sayIdRef.current) return;
        finished = true;
        clearTimeout(sayWatchdogRef.current);
        speakingRef.current = false;
        if (activeRef.current) {
          setCallStatus(mutedRef.current ? "muted" : "listening");
          setStatusText(mutedRef.current ? "Microphone muted" : "Listening...");
          onDone && onDone();
        }
      };

      sayWatchdogRef.current = setTimeout(finish, 2600 + text.length * 85);

      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setTimeout(finish, Math.min(3200, text.length * 40));
        return;
      }

      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voice = getFemaleVoice();
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      u.rate = 1.03;
      u.pitch = 1.02;
      u.onend = finish;
      u.onerror = finish;

      setTimeout(() => {
        if (id === sayIdRef.current) {
          window.speechSynthesis.speak(u);
        }
      }, 50);
    },
    [getFemaleVoice]
  );

  // Add message to chat log
  const addMessage = useCallback((sender: "agent" | "user", text: string) => {
    setMessages((prev) => [...prev, { sender, text }]);
    setTimeout(() => {
      if (chatLogRef.current) {
        chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
      }
    }, 60);
  }, []);

  // Start speech recognition
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusText("Voice input not supported in this browser. Please type below.");
      return;
    }

    if (!activeRef.current || mutedRef.current || speakingRef.current || recognitionRef.current) {
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setCallStatus("listening");
        setStatusText("Listening...");
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        if (interim) {
          setStatusText(`"${interim}"`);
        }
        if (final) {
          handleInputRef.current(final);
        }
      };

      rec.onerror = (e: any) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setStatusText("Microphone permission blocked. You can type in the chat box.");
        }
      };

      rec.onend = () => {
        recognitionRef.current = null;
        if (activeRef.current && !mutedRef.current && !speakingRef.current) {
          setTimeout(startListening, 240);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (_) {
      recognitionRef.current = null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }
  }, []);

  // Agent response dispatcher
  const respond = useCallback(
    (text: string, andThen?: () => void) => {
      addMessage("agent", text);
      say(text, () => {
        andThen && andThen();
        startListening();
      });
    },
    [addMessage, say, startListening]
  );

  // Form filling helpers for #kf
  const fillDOMField = (id: string, value: string) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
    if (el) {
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const selectPOSInDOM = (posName: string) => {
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
    // If not directly matched, select "Other POS" and populate custom field
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
  };

  const syncChannelsInDOM = (requestedLabels: string[]) => {
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
  };

  const toggleChannelInDOM = (channelKeyword: string) => {
    syncChannelsInDOM([channelKeyword]);
  };

  const selectTomorrowSlotInDOM = (): Promise<string> => {
    return new Promise((resolve) => {
      const ds = document.getElementById("ds");
      const ts = document.getElementById("ts");
      if (!ds || !ts) {
        resolve("");
        return;
      }
      const cards = Array.from(ds.querySelectorAll<HTMLButtonElement>(".dc"));
      if (!cards.length) {
        resolve("");
        return;
      }

      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const tomDate = tomorrow.getDate();
      const M = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      const tomMonth = M[tomorrow.getMonth()];

      let targetCard = cards.find((card) => {
        const b = card.querySelector("b");
        const dNum = b ? parseInt(b.textContent || "", 10) : null;
        return dNum === tomDate && card.textContent?.includes(tomMonth);
      });

      if (!targetCard) {
        const todayDate = now.getDate();
        const todayMonth = M[now.getMonth()];
        const firstCard = cards[0];
        const firstB = firstCard.querySelector("b");
        const firstNum = firstB ? parseInt(firstB.textContent || "", 10) : null;
        const isFirstToday = firstNum === todayDate && firstCard.textContent?.includes(todayMonth);
        targetCard = isFirstToday && cards.length > 1 ? cards[1] : cards[0];
      }

      const chooseTime = () => {
        const firstSlot = ts.querySelector<HTMLButtonElement>(".tsl:not([disabled])");
        if (firstSlot) {
          firstSlot.click();
          const psum = document.getElementById("psum");
          const slotText = (psum?.textContent || "").replace(/^✓\s*/, "").trim() || firstSlot.textContent?.trim() || "";
          formDataRef.current.slot = slotText;
          resolve(slotText);
        } else {
          resolve("");
        }
      };

      let resolved = false;
      const observer = new MutationObserver(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          setTimeout(chooseTime, 40);
        }
      });
      observer.observe(ts, { childList: true, subtree: true });

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          chooseTime();
        }
      }, 1000);

      targetCard.click();
    });
  };

  const submitBookingFormInDOM = () => {
    const form = document.getElementById("kf") as HTMLFormElement;
    if (form) {
      form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }
  };

  // Conversational Form Booking Engine
  const handleBookingTurn = useCallback(
    (text: string) => {
      const clean = text.trim();
      const stage = formStageRef.current;

      if (/^(cancel|stop|never mind|exit|abort|forget it)/i.test(clean)) {
        formStageRef.current = "idle";
        respond("No problem, I've cancelled the demo form. What else would you like to explore?");
        return true;
      }

      if (stage === "name") {
        formDataRef.current.name = clean;
        setUserName(clean);
        fillDOMField("k-n", clean);
        formStageRef.current = "restaurant";
        respond(`Got it, ${clean}! What is the name of your restaurant?`);
        return true;
      }

      if (stage === "restaurant") {
        formDataRef.current.restaurant = clean;
        fillDOMField("k-r", clean);
        formStageRef.current = "contact";
        respond(`Got it, ${clean}! What is the best phone number or email address to reach you on?`);
        return true;
      }

      if (stage === "contact") {
        formDataRef.current.contact = clean;
        fillDOMField("k-c", clean);
        formStageRef.current = "channels";
        respond(
          "Great! Which channels are you interested in? We offer AI Voice Agent, WhatsApp Chatbot, AI Ordering Website, and Meta Chatbot."
        );
        return true;
      }

      if (stage === "channels") {
        const lower = clean.toLowerCase();
        const ch: string[] = [];
        if (/\b(all|everything)\b/i.test(lower)) {
          ch.push("Everything");
        } else {
          if (lower.includes("voice") || lower.includes("call") || lower.includes("phone")) ch.push("Voice agent");
          if (lower.includes("whatsapp") || lower.includes("text")) ch.push("WhatsApp chatbot");
          if (lower.includes("web") || lower.includes("site") || lower.includes("storefront") || lower.includes("order")) ch.push("AI ordering website");
          if (lower.includes("meta") || lower.includes("instagram") || lower.includes("facebook") || lower.includes("dm")) ch.push("Meta chatbot");
        }
        if (!ch.length) ch.push("Voice agent");
        formDataRef.current.channels = ch;
        syncChannelsInDOM(ch);

        formStageRef.current = "pos";
        respond("Understood. And which POS system does your restaurant use, such as Toast, Clover, Square, or Lightspeed?");
        return true;
      }

      if (stage === "pos") {
        const lower = clean.toLowerCase();
        let detected = "";
        if (lower.includes("toast")) detected = "Toast";
        else if (lower.includes("clover")) detected = "Clover";
        else if (lower.includes("square")) detected = "Square";
        else if (lower.includes("lightspeed")) detected = "Lightspeed";
        else if (lower.includes("revel")) detected = "Revel";
        else if (lower.includes("epos")) detected = "Epos Now";
        else if (/\b(none|no pos|don'?t use|not yet)\b/i.test(lower)) detected = "I don't use a POS yet";
        else if (lower.includes("other") || lower.includes("custom")) detected = "Other POS";

        const posVal = detected || clean;
        formDataRef.current.pos = posVal;
        selectPOSInDOM(posVal);

        formStageRef.current = "time";
        selectTomorrowSlotInDOM().then(() => {
          respond(
            `Perfect, we connect directly with ${posVal}. I've selected the first available slot tomorrow on the calendar. Would you like me to submit your demo request now?`
          );
        });
        return true;
      }

      if (stage === "time" || stage === "confirm") {
        if (/^(yes|yeah|yep|sure|please|confirm|send it|do it|ok|okay|submit)\b/i.test(clean)) {
          submitBookingFormInDOM();
          formStageRef.current = "idle";
          respond(
            `You're all set! We have submitted your 20-minute tailored demo request for ${formDataRef.current.restaurant || "your restaurant"}. Our engineering team will review your menu and follow up shortly.`
          );
          return true;
        } else if (/^(no|wait|change|hold on)\b/i.test(clean)) {
          respond("No problem. Feel free to adjust any fields on the form on screen, or let me know what you'd like to change.");
          formStageRef.current = "idle";
          return true;
        }
      }

      return false;
    },
    [respond, setUserName]
  );

  // ROI Calculator parsing (used by legacy fallback)
  const handleROITurn = useCallback(
    (text: string) => {
      navigateTo("roi");
      const callsMatch = text.match(/(\d+)\s*(?:weekly\s+|per week\s+|a week\s+)?(?:missed\s+)?calls?/i);
      const aovMatch = text.match(/(?:€|\$|£)\s*(\d+)|(\d+)\s*(?:euros?|dollars?|bucks|pounds)|(?:order value|aov)\s*(?:is\s+)?(\d+)/i);
      const calls = callsMatch ? parseInt(callsMatch[1], 10) : null;
      const aov = aovMatch ? parseInt(aovMatch[1] || aovMatch[2] || aovMatch[3], 10) : null;

      const cw = document.getElementById("cw") as HTMLInputElement;
      const ca = document.getElementById("ca") as HTMLInputElement;
      const cc = document.getElementById("cc") as HTMLInputElement;

      if (calls !== null && cw) {
        cw.value = String(calls);
        cw.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (aov !== null && ca) {
        ca.value = String(aov);
        ca.dispatchEvent(new Event("input", { bubbles: true }));
      }

      const currentCalls = cw ? +cw.value : 40;
      const currentAov = ca ? +ca.value : 28;
      const currentIntent = cc ? +cc.value / 100 : 0.6;

      const orders = Math.round(currentCalls * 4.333 * currentIntent);
      const monthly = Math.round(orders * currentAov);
      const annual = monthly * 12;

      respond(
        `With ${currentCalls} missed calls a week and an average order of ${currentAov} euros, you'd recover about ${orders} orders a month, totaling roughly €${monthly.toLocaleString()} monthly and €${annual.toLocaleString()} annually. You can see the live breakdown on the calculator.`
      );
    },
    [navigateTo, respond]
  );

  // ROI Tool executor (called by LLM calculate_roi action)
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

  // Run actions invoked by the LLM
  const runActions = useCallback(
    (actions: { name: string; input: any }[]): string => {
      let extraText = "";
      for (const action of actions) {
        const { name, input = {} } = action;
        switch (name) {
          case "navigate_to":
            console.log(`%c[Voice Orb Action] 🧭 navigate_to("${input.section}")`, "color: #f59e0b; font-weight: bold;");
            if (input.section) {
              navigateTo(input.section);
            }
            break;
          case "calculate_roi": {
            console.log("%c[Voice Orb Action] 💰 calculate_roi", "color: #f59e0b; font-weight: bold;", input);
            const summary = handleROIFromTool(input);
            if (summary) {
              extraText = extraText ? `${extraText} ${summary}` : summary;
            }
            break;
          }
          case "fill_booking_field": {
            console.log(`%c[Voice Orb Action] 📝 fill_booking_field(${input.field} = "${input.value}")`, "color: #f59e0b; font-weight: bold;");
            const { field, value } = input;
            if (field && value !== undefined && value !== null) {
              const valStr = String(value);
              if (field === "name" && valStr.trim()) {
                const trimmed = valStr.trim();
                formDataRef.current.name = trimmed;
                fillDOMField("k-n", trimmed);
                setUserName(trimmed);
              } else if (field === "restaurant") {
                formDataRef.current.restaurant = valStr;
                fillDOMField("k-r", valStr);
              } else if (field === "contact") {
                formDataRef.current.contact = valStr;
                fillDOMField("k-c", valStr);
              } else if (field === "pos") {
                formDataRef.current.pos = valStr;
                selectPOSInDOM(valStr);
              } else if (field === "channels") {
                const parts = valStr.split(",").map((s) => s.trim()).filter(Boolean);
                formDataRef.current.channels = parts;
                syncChannelsInDOM(parts);
              }
            }
            break;
          }
          case "select_slot":
            console.log("%c[Voice Orb Action] 📅 select_slot", "color: #f59e0b; font-weight: bold;", input);
            selectTomorrowSlotInDOM();
            break;
          case "submit_booking":
            console.log("%c[Voice Orb Action] 🚀 submit_booking()", "color: #f59e0b; font-weight: bold;");
            submitBookingFormInDOM();
            setTimeout(() => {
              const kdone = document.getElementById("kdone");
              const isSuccess = kdone && !kdone.hidden && kdone.style.display !== "none";
              if (!isSuccess) {
                stageRef.current = "booking";
                let errorMsg = "";
                const errEls = Array.from(document.querySelectorAll<HTMLElement>(".kxi.err .kxe, .kxe"));
                const foundErr = errEls.find((el) => el.textContent && el.textContent.trim().length > 0);
                if (foundErr && foundErr.textContent) {
                  errorMsg = foundErr.textContent.trim();
                } else {
                  const psum = document.getElementById("psum");
                  if (psum && psum.classList.contains("pe") && psum.textContent) {
                    errorMsg = psum.textContent.trim();
                  }
                }
                const corrective = errorMsg
                  ? `Wait, it looks like something was missed: ${errorMsg}`
                  : "It looks like a required field is missing on the form. Could you please provide that?";
                respond(corrective);
              }
            }, 600);
            break;
          case "end_call":
            console.log("%c[Voice Orb Action] 📞 end_call()", "color: #f59e0b; font-weight: bold;");
            setTimeout(onClose, 2500);
            break;
          default:
            break;
        }
      }
      return extraText;
    },
    [handleROIFromTool, navigateTo, onClose]
  );

  // Extract name helper
  const extractName = (text: string): string => {
    let t = text.trim().replace(/[.,!?]/g, "");
    const intro = /^(?:(?:hi|hello|hey)[ ,]+)?(?:my name is|my name's|i am|i'm|im|this is|it's|its|call me|they call me)\s+/i;
    if (intro.test(t)) return t.replace(intro, "").split(/\s+/).slice(0, 2).join(" ");
    t = t.replace(/^(hi|hello|hey)\s+/i, "");
    const words = t.split(/\s+/);
    return words.length <= 2 ? words.join(" ") : "";
  };

  // Legacy Regex Waterfall Router (Fallback)
  const legacyRoute = useCallback(
    (text: string) => {
      // 1. If currently in booking flow
      if (formStageRef.current !== "idle") {
        if (handleBookingTurn(text)) return;
      }

      // 2. Name capture during greeting stage
      if (callStatus === "greeting" || !userName) {
        const found = extractName(text);
        if (found && !/^(book|demo|what|how|why|tell|pos|roi)/i.test(found)) {
          setUserName(found);
          formDataRef.current.name = found;
          fillDOMField("k-n", found);
          respond(
            `Nice to meet you, ${found}! I can walk you through our voice agent, WhatsApp, or Meta chatbots, calculate your missed-call ROI, or schedule a free 20-minute tailored demo for your restaurant. What would you like to explore?`
          );
          return;
        }
      }

      const lower = text.toLowerCase();

      // 3. Goodbye / Hang up (Requires "close the call" instead of generic "close")
      if (/\b(bye|goodbye|hang up|end call|close the call|that's all)\b/i.test(lower)) {
        respond("Thank you for exploring CallAutomate! Have a great day.", () => {
          setTimeout(onClose, 1200);
        });
        return;
      }

      // 4. Booking a demo meeting
      if (/\b(book|demo|meeting|schedule|appointment|trial)\b/i.test(lower)) {
        navigateTo("contact");
        formStageRef.current = "restaurant";
        if (userName) {
          fillDOMField("k-n", userName);
          respond(`Let's get your free 20-minute tailored demo scheduled! What is the name of your restaurant?`);
        } else {
          formStageRef.current = "name";
          respond("I would love to help you schedule a free 20-minute demo! First, what is your name?");
        }
        return;
      }

      // 5. ROI Calculator
      if (/\b(roi|calculator|revenue|missed calls?|losing|lost calls?)\b/i.test(lower)) {
        handleROITurn(text);
        return;
      }

      // 6. Phone number FAQ (Moved above voice agent rule so "Do I need a new phone number?" won't be caught by voice rule)
      if (/\b(keep (my )?number|new number|phone number|landline|voip|sip)\b/i.test(lower)) {
        navigateTo("integrations");
        respond(
          "No new number is needed! CallAutomate works directly with your existing restaurant landline or VoIP number using standard carrier call forwarding or SIP routing."
        );
        return;
      }

      // 7. Voice Agent Channel
      if (/\b(voice|phone|call agent|answers?|first ring|concurrent)\b/i.test(lower)) {
        navigateTo("p-voice");
        respond(
          "Our AI Voice Agent picks up on the 1st ring with zero robotic delays. It handles complex modifiers, upsells high-margin sides, answers unlimited concurrent calls, and sends the ticket straight into your POS."
        );
        return;
      }

      // 8. WhatsApp Chatbot (Restricted from broad "chat" to whatsapp|texting|text message)
      if (/\b(whatsapp|texting|text message)\b/i.test(lower)) {
        navigateTo("p-wa");
        respond(
          "The WhatsApp Chatbot lets your customers order like texting a friend. It features interactive quick-reply buttons, secure checkout payment links, and live order tracking right in the chat."
        );
        return;
      }

      // 9. AI Ordering Website
      if (/\b(website|web|storefront|commission|online order)\b/i.test(lower)) {
        navigateTo("p-web");
        respond(
          "Our AI Ordering Website gives you a branded storefront with an interactive ordering assistant and live POS menu sync, saving you the 20 to 30 percent commission fees charged by third-party delivery apps."
        );
        return;
      }

      // 10. Meta Chatbot
      if (/\b(instagram|facebook|meta|dms?|social)\b/i.test(lower)) {
        navigateTo("p-meta");
        respond(
          "The Meta Chatbot automates Instagram DMs and Facebook Messenger 24/7. It answers opening hours, allergens, and parking instantly, and turns profile traffic and story replies into paid orders."
        );
        return;
      }

      // 11. How It Works
      if (/\b(how it works|steps|workflow|walk me through)\b/i.test(lower)) {
        navigateTo("story");
        respond(
          "It's a seamless 4-step flow: 1. Customer contacts via phone, WhatsApp, or web. 2. AI answers instantly and upsells. 3. Order is confirmed with payment. 4. Ticket prints straight on your kitchen POS line."
        );
        return;
      }

      // 12. POS Integrations
      if (/\b(pos|toast|clover|square|lightspeed|revel|epos|integration)\b/i.test(lower)) {
        navigateTo("integrations");
        respond(
          "CallAutomate integrates natively with Toast, Clover, and Square, plus Lightspeed, Revel, and Epos Now. Tickets fire automatically to your kitchen printers, with fail-safe redundancy if internet drops."
        );
        return;
      }

      // 13. Setup time FAQ
      if (/\b(how long|setup|onboard|go live)\b/i.test(lower)) {
        respond(
          "Most restaurants are fully live within a few days. Our engineering team handles complete menu transcription, voice tuning, modifier setup, and POS connection testing."
        );
        return;
      }

      // 14. Talk to human / Support
      if (/\b(human|person|manager|representative|support|email)\b/i.test(lower)) {
        navigateTo("contact");
        respond(
          "In a live deployment, callers can be transferred instantly to your on-duty staff. To reach our support team directly, call or WhatsApp +353-61-555-222, or email support@callautomate.ai."
        );
        return;
      }

      // Default fallback
      respond(
        "I can walk you through our voice agent, WhatsApp, or Meta ordering channels, calculate your missed-call ROI, or book a free 20-minute tailored demo. Would you like to schedule a demo?"
      );
    },
    [callStatus, handleBookingTurn, handleROITurn, navigateTo, onClose, respond, userName]
  );

  // Main Intent & Speech Router (LLM Powered with Legacy Fallback)
  const handleUserInput = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text) return;

      stopListening();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      addMessage("user", text);

      // Local instant checks before API call
      if (formStageRef.current !== "idle" && /^(cancel|stop|never mind|exit|abort|forget it)/i.test(text)) {
        formStageRef.current = "idle";
        respond("No problem, I've cancelled the demo form. What else would you like to explore?");
        return;
      }

      if (/\b(bye|goodbye|hang up|end call|close the call|that's all)\b/i.test(text.toLowerCase())) {
        respond("Thank you for exploring CallAutomate! Have a great day.", () => {
          setTimeout(onClose, 1200);
        });
        return;
      }

      historyRef.current.push({ role: "user", content: text });
      setStatusText("Thinking...");

      console.groupCollapsed(`%c[Voice Orb] User Speech: "${text}"`, "color: #2e8fed; font-weight: bold;");
      console.log("▶ Outgoing Context to /api/orb:", {
        userName: userName || formDataRef.current.name,
        form: { ...formDataRef.current },
        stage: stageRef.current,
        viewed: viewedRef.current,
        historyLength: historyRef.current.length + 1
      });

      let res: {
        reply?: string;
        actions?: { name: string; input: any }[];
        stage?: string;
        viewed?: string[];
        suffix?: string;
        error?: boolean;
      } = { error: true };
      const t0 = performance.now();
      try {
        const apiRes = await fetch("/api/orb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: historyRef.current,
            userName: userName || formDataRef.current.name,
            form: formDataRef.current,
            stage: stageRef.current,
            viewed: viewedRef.current,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (apiRes.ok) {
          res = await apiRes.json();
          if (!res.error) {
            stageRef.current = res.stage ?? stageRef.current;
            viewedRef.current = res.viewed ?? viewedRef.current;
          }
        } else {
          console.warn(`[Voice Orb] API call failed with HTTP status: ${apiRes.status}`);
        }
      } catch (err) {
        console.error("[Voice Orb] API Network exception:", err);
        res = { error: true };
      }
      const durationMs = Math.round(performance.now() - t0);

      console.log(`▶ Groq API Response (${durationMs}ms):`, res);

      if (res.error || (!res.reply && !res.actions?.length)) {
        console.warn("[Voice Orb] ⚠️ Groq API unavailable or empty -> Falling back to legacy regex route.");
        console.groupEnd();
        legacyRoute(text);
        return;
      }

      const extra = runActions(res.actions || []);
      const defaultReply = "I can walk you through our voice agent, WhatsApp, or web ordering channels, or book a free 20-minute tailored demo for your restaurant. What would you like to explore?";
      const reply = (res.reply || defaultReply) + (extra ? " " + extra : "") + (res.suffix ? " " + res.suffix : "");
      console.log(`%c▶ Spoken Speech: "${reply}"`, "color: #10b981; font-weight: bold;");
      console.groupEnd();

      historyRef.current.push({ role: "assistant", content: reply });
      respond(reply);
    },
    [addMessage, legacyRoute, onClose, respond, runActions, stopListening, userName]
  );

  handleInputRef.current = handleUserInput;

  // Setup Meter & Audio Context
  useEffect(() => {
    if (!isOpen) return;
    activeRef.current = true;
    mutedRef.current = false;
    stageRef.current = "name";
    viewedRef.current = [];
    setUserName("");
    formDataRef.current = {
      name: "",
      restaurant: "",
      contact: "",
      channels: [],
      pos: "",
      slot: "",
    };
    formStageRef.current = "idle";
    historyRef.current = [];
    setViewMode("fullscreen");

    const startAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        ctx.createMediaStreamSource(stream).connect(analyser);
      } catch (_) {
        // Mic denied/unavailable, continue gracefully
      }
    };

    startAudio();

    // Initial greeting
    const greetingText = "Hi, this is CallAutomate for Restaurants. Every call answered, every order in your POS. What's your name?";
    addMessage("agent", greetingText);
    say(greetingText, () => {
      startListening();
    });

    return () => {
      activeRef.current = false;
      stopListening();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      (window as any).mic = 0;
    };
  }, [isOpen, addMessage, say, startListening, stopListening]);

  // Orb Animation Loop & Mouse Parallax
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SZ = 320;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SZ * dpr;
    canvas.height = SZ * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const PALETTE = {
      speaking: ["#e6fbff", "#7be0ff", "#2e8fed", "#16318a"],
      listening: ["#dbe8ff", "#6aa5ff", "#2e73ed", "#16318a"],
      idle: ["#dbe8ff", "#6aa5ff", "#2e73ed", "#16318a"],
    };

    let startTime = performance.now();

    const render = (now: number) => {
      const t = (now - startTime) / 1000;

      // Calculate audio level
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
      (window as any).mic = lvl;

      // Update Orb Wrapper CSS custom property for glowing backdrop
      if (orbWrapRef.current) {
        orbWrapRef.current.style.setProperty("--lvl", lvl.toFixed(3));
      }

      // Draw Main Orb
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

      // Specular Highlight
      const hl = ctx.createRadialGradient(c - 36, c - 46, 2, c - 36, c - 46, 75);
      hl.addColorStop(0, "rgba(255, 255, 255, 0.58)");
      hl.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = hl;
      ctx.fill();

      // Animate Waveform Bars in Fullscreen Stage
      if (waveBarsRef.current) {
        const bars = waveBarsRef.current.querySelectorAll("span");
        bars.forEach((b, i) => {
          const idle = speakingRef.current ? 0.3 + 0.35 * Math.abs(Math.sin(t * 5 + i * 1.3)) : 0.08;
          const v = Math.min(1, Math.max(idle, lvl * (1.3 + i * 0.12)));
          (b as HTMLElement).style.height = `${18 + v * 36}px`;
        });
      }

      // Animate Waveform Bars in Docked HUD
      if (dockedWaveBarsRef.current) {
        const bars = dockedWaveBarsRef.current.querySelectorAll("span");
        bars.forEach((b, i) => {
          const idle = speakingRef.current ? 0.35 + 0.35 * Math.abs(Math.sin(t * 5 + i * 1.3)) : 0.12;
          const v = Math.min(1, Math.max(idle, lvl * 1.4));
          (b as HTMLElement).style.height = `${6 + v * 18}px`;
        });
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    // Mouse parallax tracking
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
    };
  }, [isOpen]);

  // Handle Mute Toggle
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    mutedRef.current = next;
    if (next) {
      stopListening();
      setCallStatus("muted");
      setStatusText("Microphone muted. You can still type below.");
    } else {
      setCallStatus("listening");
      setStatusText("Listening...");
      startListening();
    }
  };

  // Chat Form Submit
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
          {/* Top Floating Pill Navbar (Matches website navbar perfectly) */}
          <div className="vo-nav-wrapper">
            <nav className="vo-navbar">
              <div className="vo-brand">
                <img src={LOGO_SRC} alt="CallAutomate" className="vo-brand-img" />
                <span>CallAutomate</span>
              </div>

              <span className="vo-session-pill">
                <i /> Live AI Voice Session
              </span>

              <div className="vo-nav-actions">
                <button
                  className="vo-nav-btn view"
                  title="View website while staying on call"
                  onClick={() => setViewMode("docked")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>View Website</span>
                </button>

                <button className="vo-nav-btn end" title="End call" onClick={onClose}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span>End Call</span>
                </button>
              </div>
            </nav>
          </div>

          {/* Center Stage Content */}
          <main className="vo-stage">
            <div className="vo-pill">
              <i />
              <span>Meet CallAutomate: the AI that picks up for you</span>
            </div>

            <h1 className="vo-title">
              {userName && userName.trim() ? (
                <>
                  Welcome, <span className="vo-gradient-heading">{userName.trim()}</span>
                </>
              ) : (
                <>
                  Every call answered.
                  <span className="vo-gradient-heading">Every order in your POS.</span>
                </>
              )}
            </h1>

            <p className="vo-subtitle">
              Voice agents, WhatsApp and Meta chatbots, and a full AI ordering website, wired into Toast, Clover and Square.
            </p>

            {/* Glowing 320px Canvas Orb */}
            <div ref={orbWrapRef} className="vo-orb-wrapper">
              <div className="vo-orb-glow" />
              <canvas ref={canvasRef} className="vo-orb-canvas" width={320} height={320} />
            </div>

            {/* Call Control Bar */}
            <div className="vo-callbar">
              <button
                className={`vo-round-btn ${isMuted ? "muted" : ""}`}
                title={isMuted ? "Unmute microphone" : "Mute microphone"}
                onClick={toggleMute}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

              <div ref={waveBarsRef} className="vo-wave">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              <button className="vo-round-btn end" title="End call" onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Live Status Pill */}
            <div className={`vo-status-pill ${callStatus}`}>
              <span>{statusText}</span>
            </div>

            {/* Suggestion Prompt Chips */}
            <div className="vo-chips">
              {DEFAULT_CHIPS.map((chip, idx) => (
                <button key={idx} className="vo-chip" onClick={() => handleUserInput(chip)}>
                  {chip}
                </button>
              ))}
            </div>
          </main>

          {/* Corner Live Conversation Panel */}
          <aside className={`vo-chat-panel ${isChatMinimized ? "minimized" : ""}`}>
            <div className="vo-chat-header" onClick={() => setIsChatMinimized(!isChatMinimized)}>
              <span>Live conversation</span>
              <small style={{ color: "#9aa4c4", fontFamily: "inherit" }}>{isChatMinimized ? "show" : "hide"}</small>
            </div>

            <div className="vo-chat-body">
              <div ref={chatLogRef} className="vo-chat-log">
                {messages.map((m, i) => (
                  <div key={i} className={`vo-msg ${m.sender}`}>
                    {m.text}
                  </div>
                ))}
              </div>

              <form className="vo-chat-form" onSubmit={handleChatSubmit}>
                <input
                  type="text"
                  className="vo-chat-input"
                  placeholder="Or type here..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
                <button type="submit" className="vo-chat-send">
                  Send
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* 2. DOCKED FLOATING HUD (When viewing/navigating the website) */}
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
