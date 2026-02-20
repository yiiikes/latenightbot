import { NextRequest, NextResponse } from "next/server";
import { handleWebhookEvent } from "@/lib/instagram";

// Store recent events in memory for the dashboard
const recentEvents: Array<{ timestamp: string; senderId: string; text: string }> = [];
export { recentEvents };

// GET — Meta webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// POST — receive webhook events from Meta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const events: Array<{ sender?: { id: string }; message?: { text?: string } }> = [];
    if (body.entry) {
      for (const e of body.entry) {
        if (e.messaging) events.push(...e.messaging);
      }
    }

    // Process in background — respond 200 immediately
    const promises = events.map(async (ev) => {
      // Store for dashboard
      recentEvents.unshift({
        timestamp: new Date().toISOString(),
        senderId: ev.sender?.id || "unknown",
        text: ev.message?.text || "(media/attachment)",
      });
      // Keep only last 50
      if (recentEvents.length > 50) recentEvents.length = 50;

      await handleWebhookEvent(ev);
    });

    // Don't await — Meta needs 200 fast
    Promise.allSettled(promises).catch(console.error);

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}
