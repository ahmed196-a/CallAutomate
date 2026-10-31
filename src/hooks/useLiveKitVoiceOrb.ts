import { NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 60;
const ipRequestMap = new Map<string, { count: number; resetTime: number }>();

function getClientIp(req: Request): string {
  const xRealIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  const forwarded = req.headers.get("x-forwarded-for");

  if (xRealIp) return xRealIp.trim();
  if (cfConnectingIp) return cfConnectingIp.trim();
  if (forwarded) return forwarded.split(",")[0].trim();
  return "127.0.0.1";
}

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

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return NextResponse.json({ reply: "", actions: [], error: true }, { status: 429 });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const userName = typeof body.userName === "string" ? body.userName : "";
    const form = (body.form ?? {}) as Record<string, unknown>;
    const viewed = Array.isArray(body.viewed) ? body.viewed : [];
    const stage = typeof body.stage === "string" ? body.stage : "name";

    const lastUserMessage = [...messages]
      .reverse()
      .find((m: any) => m?.role === "user")?.content ?? "";

    const name = String(form.name ?? userName ?? "");
    const reply = lastUserMessage
      ? `Thanks ${name || "there"}! I’ve received your message and our team will get back to you shortly.`
      : "Thanks for your interest. Our team will reach out to you shortly.";

    return NextResponse.json({
      reply,
      actions: [],
      stage,
      viewed,
      suffix: "",
    });
  } catch (error) {
    console.error("Orb API error:", error);
    return NextResponse.json({ reply: "", actions: [], error: true }, { status: 500 });
  }
}
