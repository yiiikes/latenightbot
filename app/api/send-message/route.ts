import { NextRequest, NextResponse } from "next/server";
import { sendText, sendMenu } from "@/lib/instagram";

export async function POST(req: NextRequest) {
  try {
    const { recipientId, text, type } = await req.json();

    if (!recipientId) {
      return NextResponse.json({ error: "recipientId is required" }, { status: 400 });
    }

    if (type === "menu") {
      await sendMenu(recipientId);
    } else {
      if (!text) {
        return NextResponse.json({ error: "text is required" }, { status: 400 });
      }
      await sendText(recipientId, text);
    }

    return NextResponse.json({ status: "sent" });
  } catch (err) {
    console.error("Send error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
