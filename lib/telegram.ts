const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

export type IntentType = "BOOK" | "LOST";

export interface TelegramNotification {
  intent: IntentType;
  username?: string;
  message: string;
}

export async function notifyTelegram({ intent, username, message }: TelegramNotification) {
  const profileLine = username ? `Профиль: @${username}` : "Профиль: недоступен";
  const text = [
    "Новая заявка из Instagram",
    `Раздел: ${intent}`,
    profileLine,
    `Сообщение: ${message}`,
  ].join("\n");

  const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TG_CHAT_ID,
      text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("TG send error:", errText);
  }

  return res;
}
