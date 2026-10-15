import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Rate limiter (in-memory: fine for local/dev, NOT reliable on serverless)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 60; // a full demo call is ~10-15 turns, 20 was too tight

const ipRequestMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestMap.get(ip);
  if (!record || now > record.resetTime) {
    ipRequestMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (record.count >= MAX_REQUESTS) return true;
  record.count += 1;
  return false;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Stage = "name" | "choose" | "followup" | "demo_offer" | "booking" | "confirm" | "done";

type Form = {
  name: string;
  restaurant: string;
  contact: string;
  channels: string[];
  pos: string;
  slot: string;
};

type Action = { name: string; input: any };
type Call = { name: string; args: any };

type Result = {
  reply: string;
  actions: Action[];
  stage: Stage;
  viewed: string[];
  suffix?: string;
};

const VALID_STAGES: Stage[] = ["name", "choose", "followup", "demo_offer", "booking", "confirm", "done"];

// ---------------------------------------------------------------------------
// Scripted content (everything Sarah SAYS lives here, not in the model)
// ---------------------------------------------------------------------------
const FOLLOWUP_Q = "Would you like to see another one, or book a demo?";

const PRODUCT_LABEL: Record<string, string> = {
  "p-voice": "Voice agent",
  "p-wa": "WhatsApp chatbot",
  "p-web": "AI ordering website",
  "p-meta": "Meta chatbot",
};

const BLURBS: Record<string, string> = {
  "p-voice":
    "Here's our AI Voice Agent. It picks up on the first ring, handles unlimited calls at the same time, suggests add-ons, and sends the order straight to your POS.",
  "p-wa":
    "Here's our WhatsApp Chatbot. Your customers order just like texting a friend, with quick-reply buttons, secure payment links, and live order tracking.",
  "p-web":
    "This is our AI Ordering Website. It gives you a branded storefront with live POS menu sync, so you stop paying the 20 to 30 percent commission that delivery apps charge.",
  "p-meta":
    "Here's our Instagram and Facebook Chatbot. It answers DMs around the clock and turns profile visits and story replies into paid orders.",
  story:
    "Here's how it works. Customers reach you by phone, WhatsApp, or your website, the AI takes the order and suggests add-ons, the order is confirmed with payment, and the ticket prints in your kitchen.",
  integrations:
    "We integrate with Toast, Clover, Square, Lightspeed, Revel, and Epos Now, and tickets go straight to your kitchen printers.",
};

const PITCH = (name: string) =>
  `Nice to meet you, ${name}! Here's what we offer: an AI Voice Agent that answers every call on the first ring, a WhatsApp chatbot that takes orders by text, a commission-free AI ordering website, and an Instagram and Facebook chatbot that turns DMs into orders. Which one would you like to see?`;

const PRICING_LINE =
  "I'd love to give you accurate details on that, but our team can cover pricing and technical specifics properly. Let's book a demo so they can walk you through it.";

const ROI_ASK =
  "Here's our ROI calculator. Roughly how many calls do you miss each week, and what's your average order value?";

const ROI_ASK_TAIL = "";

const FAQ: Record<string, { section: string; text: string }> = {
  pos_support: { section: "integrations", text: BLURBS.integrations },
  phone_number: {
    section: "integrations",
    text: "No new number is needed. CallAutomate works with your existing landline or VoIP number using call forwarding or SIP.",
  },
  setup_time: {
    section: "story",
    text: "Most restaurants are live in under 48 hours. Our team handles your menu, voice tuning, and POS setup for you.",
  },
};

type MissingField = "name" | "restaurant" | "contact" | "pos" | "channels";

const PROMPTS: Record<MissingField, string> = {
  name: "What's your name?",
  restaurant: "What's the name of your restaurant?",
  contact: "What's the best phone number or email to reach you on?",
  pos: "Which POS system do you use, such as Toast, Clover, Square, or Lightspeed?",
  channels:
    "Which would you like the demo to focus on: the voice agent, WhatsApp, the ordering website, the Meta chatbot, or everything?",
};

function nextMissing(form: Form): MissingField | null {
  if (!form.name?.trim()) return "name";
  if (!form.restaurant?.trim()) return "restaurant";
  if (!form.contact?.trim()) return "contact";
  if (!form.pos?.trim()) return "pos";
  if (!form.channels?.length) return "channels";
  return null;
}

function reprompt(stage: Stage, form: Form): string {
  switch (stage) {
    case "name":
      return "Sorry, I didn't catch that. What's your name?";
    case "choose":
      return "Sorry, I didn't catch that. Which would you like to see: the voice agent, WhatsApp, the ordering website, or the Instagram and Facebook chatbot?";
    case "followup":
      return "Sorry, could you say that again? Would you like to see another product, or book a demo?";
    case "demo_offer":
      return "Sorry, I didn't catch that. Shall I book a demo for you?";
    case "confirm":
      return "Sorry, I missed that. Shall I go ahead and book your demo for the first slot tomorrow?";
    case "booking": {
      const m = nextMissing(form);
      return `Sorry, I didn't catch that. ${m ? PROMPTS[m] : "Shall I book your demo?"}`;
    }
    default:
      return "Sorry, I didn't catch that. Is there anything else I can help with?";
  }
}

// ---------------------------------------------------------------------------
// Normalisers (speech recognition output is messy)
// ---------------------------------------------------------------------------
function cleanName(raw: any): string | null {
  if (typeof raw !== "string") return null;
  const t = raw
    .replace(/[^\p{L}\s'-]/gu, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ")
    .slice(0, 40);
  return t || null;
}

function normalizeContact(raw: any): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;
  const spoken = v.toLowerCase().replace(/\s+at\s+/g, "@").replace(/\s+dot\s+/g, ".");
  const compact = spoken.replace(/\s+/g, "");
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(compact)) return compact;
  const digits = v.replace(/\D/g, "");
  if (digits.length >= 7 && digits.length <= 15) return v;
  return null;
}

function normalizePos(raw: any): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const l = raw.toLowerCase();
  if (l.includes("toast")) return "Toast";
  if (l.includes("clover")) return "Clover";
  if (l.includes("square")) return "Square";
  if (l.includes("lightspeed") || l.includes("light speed")) return "Lightspeed";
  if (l.includes("revel")) return "Revel";
  if (l.includes("epos")) return "Epos Now";
  if (/\b(none|no pos|don'?t use|do not use|not yet|don'?t have)\b/.test(l)) return "I don't use a POS yet";
  return "Other POS";
}

function normalizeChannels(raw: any): string[] {
  if (typeof raw !== "string") return [];
  const l = raw.toLowerCase();
  if (/\b(everything|all of them|all|every one)\b/.test(l)) return ["Everything"];
  const out: string[] = [];
  if (/(voice|phone|call)/.test(l)) out.push("Voice agent");
  if (/(whatsapp|text)/.test(l)) out.push("WhatsApp chatbot");
  if (/(web|site|storefront|ordering)/.test(l)) out.push("AI ordering website");
  if (/(meta|instagram|facebook|dm)/.test(l)) out.push("Meta chatbot");
  return out;
}

// ---------------------------------------------------------------------------
// LLM: used ONLY to understand what the caller meant (forced tool call).
// Sarah's words come from the scripted text above.
// ---------------------------------------------------------------------------
const STAGE_HELP: Record<Stage, string> = {
  name: "Sarah just greeted the caller and asked for their name.",
  choose: "Sarah listed the four products and asked which one the caller wants to see.",
  followup: "Sarah just showed a product and asked whether the caller wants to see another one or book a demo.",
  demo_offer: "Sarah offered to book a demo and is waiting for yes or no.",
  booking: "Sarah is collecting demo booking details (restaurant, contact, POS, interest).",
  confirm: "Sarah asked permission to book the first available slot tomorrow and is waiting for yes or no.",
  done: "The demo request has been submitted.",
};

function buildSystemPrompt(stage: Stage, form: Form): string {
  return `You are the listening brain for Sarah, a voice sales agent for CallAutomate (AI ordering for restaurants).
You do NOT speak. Another system writes Sarah's words. Your only job is to read the caller's LATEST message and call the matching tool(s).

The text comes from speech recognition and often has mistakes (for example "bordering" instead of "ordering"). If you cannot tell what the caller means, call "unclear". Never guess a name, restaurant, phone number or email.

Current stage: ${STAGE_HELP[stage]}
Known so far: ${JSON.stringify(form)}

How to choose tools:
- Caller gives their name -> set_name.
- Caller wants to see or hear about something -> show_section. Mapping: phone / voice / calls -> p-voice; WhatsApp / texting -> p-wa; website / web ordering / online ordering / storefront -> p-web; Instagram / Facebook / Meta / DMs -> p-meta; "how does it work" -> story; POS / integrations -> integrations; ROI / calculator / lost revenue -> roi.
- Caller wants to book, schedule, or try a demo -> request_demo.
- Caller asks about price, cost, plans, fees, contracts, or any technical or in-depth question beyond the FAQ tool (APIs, security, accuracy, languages, hosting, data, limits, customization) -> pricing_or_technical.
- Simple FAQs: which POS are supported -> faq pos_support; do I need a new phone number -> faq phone_number; how long to set up -> faq setup_time.
- Wants a human, a manager, or the team's contact details -> contact_team.
- Gives booking details (restaurant, phone or email, POS, channels of interest) -> provide_field, one call per field.
- Caller gives numbers for missed calls per week and/or average order value -> calculate_roi.
- A plain yes or no to Sarah's last question -> answer_yes_no.
- Goodbye or hang up -> end_call.
- Anything unintelligible or unrelated -> unclear.
You may call more than one tool when the caller says several things at once.`;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "set_name",
      description: "The caller told us their own name.",
      parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
    },
  },
  {
    type: "function",
    function: {
      name: "show_section",
      description: "Caller wants to see or learn about a product or section of the website.",
      parameters: {
        type: "object",
        properties: {
          section: { type: "string", enum: ["p-voice", "p-wa", "p-web", "p-meta", "story", "integrations", "roi"] },
        },
        required: ["section"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_demo",
      description: "Caller wants to book or schedule a demo.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "pricing_or_technical",
      description: "Caller asks about pricing, cost, plans, fees, or a technical question that needs the team.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "faq",
      description: "Caller asks one of the simple FAQs.",
      parameters: {
        type: "object",
        properties: { topic: { type: "string", enum: ["pos_support", "phone_number", "setup_time"] } },
        required: ["topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "contact_team",
      description: "Caller wants to talk to a human or get the team's contact details.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "provide_field",
      description: "Caller gave a booking detail.",
      parameters: {
        type: "object",
        properties: {
          field: { type: "string", enum: ["restaurant", "contact", "pos", "channels"] },
          value: { type: "string" },
        },
        required: ["field", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate_roi",
      description: "Caller gave missed calls per week and/or average order value.",
      parameters: {
        type: "object",
        properties: {
          missed_calls_per_week: { type: "number" },
          avg_order_value: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "answer_yes_no",
      description: "Caller answered yes or no to Sarah's last question.",
      parameters: {
        type: "object",
        properties: { answer: { type: "string", enum: ["yes", "no"] } },
        required: ["answer"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "end_call",
      description: "Caller says goodbye or wants to hang up.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "unclear",
      description: "The message is unintelligible, garbled, or unrelated.",
      parameters: { type: "object", properties: {} },
    },
  },
];

// Short, whole-utterance yes/no answers don't need the model at all.
const YES_RE =
  /^(yes|yeah|yep|yup|sure|ok|okay|please|go ahead|do it|confirm|book it|sounds good|that works|absolutely|definitely)[\s.!,]*(please|thanks|thank you)?[\s.!]*$/i;
const NO_RE = /^(no|nope|nah|not now|not yet|wait|hold on)[\s.!,]*$/i;

function quickIntent(stage: Stage, text: string): Call[] | null {
  if (!["followup", "demo_offer", "confirm"].includes(stage)) return null;
  const t = text.trim();
  if (YES_RE.test(t)) return [{ name: "answer_yes_no", args: { answer: "yes" } }];
  if (NO_RE.test(t)) return [{ name: "answer_yes_no", args: { answer: "no" } }];
  return null;
}

// ---------------------------------------------------------------------------
// Decision engine: stage + intent -> reply, actions, next stage
// ---------------------------------------------------------------------------
function decide(stage: Stage, form0: Form, viewed0: string[], calls: Call[]): Result {
  const form: Form = { ...form0, channels: [...(form0.channels || [])] };
  const viewed = [...viewed0];
  const actions: Action[] = [];
  const has = (n: string) => calls.find((c) => c.name === n);

  const reply = (text: string, next: Stage, extra: Partial<Result> = {}): Result => ({
    reply: text,
    actions,
    stage: next,
    viewed,
    ...extra,
  });

  const fill = (field: string, value: string) =>
    actions.push({ name: "fill_booking_field", input: { field, value } });

  // 1. Apply field updates ---------------------------------------------------
  let nameJustSet = false;
  let fieldsApplied = 0;
  let contactRejected = false;

  for (const c of calls) {
    if (c.name === "set_name") {
      const n = cleanName(c.args?.name);
      const allowed = stage === "name" || stage === "booking" || stage === "confirm" || !form.name;
      if (n && allowed) {
        form.name = n;
        fill("name", n);
        nameJustSet = true;
        fieldsApplied++;
      }
    }
    if (c.name === "provide_field" && (stage === "booking" || stage === "confirm")) {
      const { field, value } = c.args || {};
      if (field === "restaurant" && typeof value === "string" && value.trim()) {
        form.restaurant = value.trim().slice(0, 60);
        fill("restaurant", form.restaurant);
        fieldsApplied++;
      } else if (field === "contact") {
        const nc = normalizeContact(value);
        if (nc) {
          form.contact = nc;
          fill("contact", nc);
          fieldsApplied++;
        } else {
          contactRejected = true;
        }
      } else if (field === "pos") {
        const np = normalizePos(value);
        if (np) {
          form.pos = np;
          fill("pos", np);
          fieldsApplied++;
        }
      } else if (field === "channels") {
        const ch = normalizeChannels(value);
        if (ch.length) {
          form.channels = ch;
          fill("channels", ch.join(", "));
          fieldsApplied++;
        }
      }
    }
  }

  // Helpers -----------------------------------------------------------------
  const bookingTurn = (prefix: string): Result => {
    // Default the demo focus to the products they actually looked at
    if (!form.channels.length && viewed.length) {
      const labels = viewed.map((s) => PRODUCT_LABEL[s]).filter(Boolean);
      if (labels.length) {
        form.channels = labels;
        fill("channels", labels.join(", "));
      }
    }
    const missing = nextMissing(form);
    if (missing) return reply(`${prefix}${PROMPTS[missing]}`.trim(), "booking");
    actions.push({ name: "select_slot", input: { day: "tomorrow" } });
    return reply(
      `${prefix}I've picked the first available slot tomorrow for your 20-minute demo. Shall I go ahead and book it?`,
      "confirm"
    );
  };

  const present = (nav: string | null, text: string, tail = FOLLOWUP_Q): Result => {
    if (nav) {
      actions.push({ name: "navigate_to", input: { section: nav } });
      if (nav.startsWith("p-") && !viewed.includes(nav)) viewed.push(nav);
    }
    if (stage === "booking" || stage === "confirm") {
      return reply(`${text} Shall we get back to booking your demo?`, "demo_offer");
    }
    if (stage === "done") return reply(`${text} Is there anything else I can help with?`, "done");
    return reply(tail ? `${text} ${tail}` : text, "followup");
  };

  // 2. Intents in priority order ---------------------------------------------
  if (has("end_call")) {
    actions.push({ name: "end_call", input: {} });
    return reply("Thank you for exploring CallAutomate! Have a great day.", "done");
  }

  if (has("pricing_or_technical")) {
    if (stage === "booking" || stage === "confirm") {
      return bookingTurn("That's something our team will cover properly on the demo. ");
    }
    if (stage === "done") {
      return reply("Our team will cover that properly on your demo. Is there anything else I can help with?", "done");
    }
    if (!form.name) {
      actions.push({ name: "navigate_to", input: { section: "contact" } });
      return reply(`${PRICING_LINE} First, what's your name?`, "booking");
    }
    return reply(`${PRICING_LINE} Shall I set that up for you?`, "demo_offer");
  }

  if (has("contact_team")) {
    const text =
      "You can reach our team on plus three five three, sixty one, five five five, two two two, or at support at callautomate dot A I. Or I can book you a demo so they walk you through everything.";
    if (stage === "booking" || stage === "confirm") return bookingTurn("");
    if (stage === "done") return reply(`${text} Is there anything else I can help with?`, "done");
    return reply(`${text} Shall I set that up?`, "demo_offer");
  }

  if (has("request_demo")) {
    if (stage === "done") {
      return reply("Your demo request is already in. Is there anything else I can help with?", "done");
    }
    if (stage === "booking" || stage === "confirm") return bookingTurn(fieldsApplied ? "Got it. " : "");
    actions.push({ name: "navigate_to", input: { section: "contact" } });
    return bookingTurn("Great, let's get your free 20-minute demo booked. ");
  }

  const show = has("show_section");
  if (show) {
    const section = String(show.args?.section || "");
    if (section === "roi") return present("roi", ROI_ASK, ROI_ASK_TAIL);
    if (BLURBS[section]) return present(section, BLURBS[section]);
  }

  const faq = has("faq");
  if (faq && FAQ[faq.args?.topic]) {
    const f = FAQ[faq.args.topic];
    return present(f.section, f.text);
  }

  const roi = has("calculate_roi");
  if (roi) {
    actions.push({ name: "calculate_roi", input: roi.args || {} });
    const tail =
      stage === "booking" || stage === "confirm"
        ? "Shall we get back to booking your demo?"
        : stage === "done"
        ? "Is there anything else I can help with?"
        : FOLLOWUP_Q;
    const next: Stage = stage === "booking" || stage === "confirm" ? "demo_offer" : stage === "done" ? "done" : "followup";
    return reply("Let me run those numbers for you.", next, { suffix: tail });
  }

  const yn = has("answer_yes_no");
  if (yn) {
    const yes = yn.args?.answer === "yes";
    switch (stage) {
      case "followup":
        return yes
          ? reply("Great! Which would you like: see another product, or book a demo?", "followup")
          : reply("No problem at all. Is there another product you'd like to see, or shall I book a demo for you?", "followup");
      case "demo_offer":
        if (yes) {
          actions.push({ name: "navigate_to", input: { section: "contact" } });
          return bookingTurn("Great, let's get your free 20-minute demo booked. ");
        }
        return reply("No problem. Would you like to see another product instead?", "followup");
      case "confirm":
        if (yes) {
          actions.push({ name: "submit_booking", input: {} });
          return reply(
            `You're all set, ${form.name}! Your 20-minute demo request for ${form.restaurant} is booked for the first available slot tomorrow, and our team will confirm shortly. Is there anything else I can help with?`,
            "done"
          );
        }
        return reply("No problem. What would you like to change? You can also edit the form on screen.", "booking");
      case "booking":
        return bookingTurn("");
      case "done":
        return reply("Is there anything else I can help with?", "done");
      default:
        return reply(reprompt(stage, form), stage);
    }
  }

  // 3. Plain field turns -------------------------------------------------------
  if (stage === "name" && nameJustSet) {
    return reply(PITCH(form.name), "choose");
  }

  if (stage === "booking" || stage === "confirm") {
    if (contactRejected) {
      return reply(`Sorry, I couldn't make out that phone number or email. ${PROMPTS.contact}`, "booking");
    }
    if (fieldsApplied) return bookingTurn("Got it. ");
  }

  if (nameJustSet) {
    return reply(`Thanks, ${form.name}! ${reprompt(stage, form).replace("Sorry, I didn't catch that. ", "")}`, stage);
  }

  // 4. Nothing usable -> ask again, do NOT navigate -----------------------------
  return reply(reprompt(stage, form), stage);
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    if (isRateLimited(ip)) {
      console.warn(`[GROQ API RATE LIMIT] IP ${ip} exceeded rate limit.`);
      return NextResponse.json({ reply: "", actions: [], error: true });
    }

    const body = await req.json();
    const { messages = [], userName = "", form: rawForm = {} } = body;

    const form: Form = {
      name: String(rawForm?.name || userName || ""),
      restaurant: String(rawForm?.restaurant || ""),
      contact: String(rawForm?.contact || ""),
      channels: Array.isArray(rawForm?.channels) ? rawForm.channels.map(String) : [],
      pos: String(rawForm?.pos || ""),
      slot: String(rawForm?.slot || ""),
    };

    const viewed: string[] = Array.isArray(body.viewed) ? body.viewed.map(String) : [];
    const stage: Stage = (VALID_STAGES as readonly string[]).includes(body.stage)
      ? (body.stage as Stage)
      : form.name
      ? "choose"
      : "name";

    const baseUrl = process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1";
    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL || "openai/gpt-oss-120b";

    if (!apiKey) {
      console.warn("[GROQ API WARNING] LLM_API_KEY is not configured.");
      return NextResponse.json({ reply: "", actions: [], error: true });
    }

    const conversationSlice = Array.isArray(messages) ? messages.slice(-6) : [];
    const lastUserMessage: string =
      [...conversationSlice].reverse().find((m: any) => m.role === "user")?.content || "";

    const endpoint = baseUrl.endsWith("/chat/completions")
      ? baseUrl
      : `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

    console.log("\n==================== [GROQ / VOICE ORB API CALL] ====================");
    console.log(`▶ Timestamp   : ${new Date().toLocaleTimeString()}`);
    console.log(`▶ Stage (in)  : ${stage}`);
    console.log(`▶ User Speech : "${lastUserMessage}"`);
    console.log(`▶ Form State  :`, JSON.stringify(form));

    let calls: Call[] | null = quickIntent(stage, lastUserMessage);
    let source = "quick-match";

    if (!calls) {
      source = "llm";
      const llmBody: any = {
        model,
        messages: [
          { role: "system", content: buildSystemPrompt(stage, form) },
          ...conversationSlice.map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content || ""),
          })),
        ],
        // max_tokens includes reasoning tokens on gpt-oss, 300 was too small
        max_tokens: 1024,
        temperature: 0.2,
        tools: TOOLS,
        tool_choice: "required",
      };
      if (model.includes("gpt-oss")) llmBody.reasoning_effort = process.env.LLM_REASONING_EFFORT || "low";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(llmBody),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`✖ Upstream error (${response.status} in ${Date.now() - startTime}ms):`, errText);
        console.log("====================================================================\n");
        return NextResponse.json({ reply: "", actions: [], error: true });
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;
      if (!message) {
        console.warn("✖ Upstream returned no message.");
        console.log("====================================================================\n");
        return NextResponse.json({ reply: "", actions: [], error: true });
      }

      calls = [];
      if (Array.isArray(message.tool_calls)) {
        for (const tc of message.tool_calls) {
          if (!tc?.function?.name) continue;
          let args: any = {};
          try {
            args = JSON.parse(tc.function.arguments || "{}");
          } catch (_) {
            args = {};
          }
          calls.push({ name: tc.function.name, args });
        }
      }
    }

    const result = decide(stage, form, viewed, calls || []);

    console.log(`✔ Intent (${source}, ${Date.now() - startTime}ms):`, JSON.stringify(calls));
    console.log(`✔ Stage         : ${stage} -> ${result.stage}`);
    console.log(`✔ Actions Run   :`, result.actions.length ? JSON.stringify(result.actions) : "None");
    console.log(`✔ Spoken Reply  : "${result.reply}"`);
    console.log("====================================================================\n");

    return NextResponse.json(result);
  } catch (err) {
    console.error("✖ Exception in /api/orb route:", err);
    console.log("====================================================================\n");
    return NextResponse.json({ reply: "", actions: [], error: true });
  }
}
