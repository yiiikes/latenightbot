import { NextResponse } from "next/server";
import { recentEvents } from "@/app/api/webhook/route";

export async function GET() {
  const configured = !!(
    process.env.VERIFY_TOKEN &&
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_CHAT_ID &&
    process.env.IG_ACCESS_TOKEN &&
    process.env.IG_USER_ID
  );

  return NextResponse.json({
    configured,
    webhookUrl: `${process.env.VERCEL_PROJECT_PRODUCTION_URL ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL : ""}/api/webhook`,
    recentEvents: recentEvents.slice(0, 20),
  });
}
