import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";
import {
  getClientIp,
  checkRateLimit,
  verifyTurnstileToken,
} from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGENT_NAME = process.env.LIVEKIT_AGENT_NAME || "callautomate-sarah";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // Rate limit token minting: max 10 requests per minute per IP
    const rateCheck = await checkRateLimit(`livekit-token:${ip}`, 10, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many token requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    // Optional Cloudflare Turnstile token verification
    const turnstileCheck = await verifyTurnstileToken(body.turnstileToken, ip);
    if (!turnstileCheck.success) {
      return NextResponse.json(
        { error: turnstileCheck.error || "CAPTCHA verification failed." },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !serverUrl) {
      console.error("[livekit-token] LiveKit environment variables missing");
      return NextResponse.json({ error: "LiveKit service is not configured." }, { status: 500 });
    }

    // Generate unique single-use room and identity for this session
    const roomName = `orb-${crypto.randomUUID()}`;
    const identity = `visitor-${crypto.randomUUID()}`;

    // Minimal grants strictly scoped to this visitor session
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: "Website visitor",
      ttl: "10m",
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    at.roomConfig = new RoomConfiguration({
      agents: [new RoomAgentDispatch({ agentName: AGENT_NAME })],
    });

    return NextResponse.json(
      { serverUrl, participantToken: await at.toJwt(), roomName },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[livekit-token] Token generation error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Could not generate session token." }, { status: 500 });
  }
}
