import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Must match AGENT_NAME in agent.py (agent_name on @server.rtc_session).
const AGENT_NAME = process.env.LIVEKIT_AGENT_NAME || "callautomate-sarah";

export async function POST() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    console.error("[livekit-token] Missing LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET");
    return NextResponse.json({ error: "LiveKit is not configured" }, { status: 500 });
  }

  // One fresh room per visitor so conversations never mix.
  const roomName = `orb-${crypto.randomUUID()}`;
  const identity = `visitor-${crypto.randomUUID()}`;

  const at = new AccessToken(apiKey, apiSecret, { identity, name: "Website visitor", ttl: "10m" });
  at.addGrant({ room: roomName, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });

  // Explicit dispatch: the agent joins the moment this visitor creates the room.
  at.roomConfig = new RoomConfiguration({
    agents: [new RoomAgentDispatch({ agentName: AGENT_NAME })],
  });

  return NextResponse.json(
    { serverUrl, participantToken: await at.toJwt(), roomName },
    { headers: { "Cache-Control": "no-store" } }
  );
}
