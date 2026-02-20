import { IntentType, notifyTelegram } from "@/lib/telegram";

const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN!;
const IG_USER_ID = process.env.IG_USER_ID!;

const TEN_MINUTES_MS = 10 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type DialogState = "IDLE" | "WAIT_BOOK_DETAILS" | "WAIT_LOST_DETAILS";

interface PendingFirstMessage {
  intent: IntentType;
  expiresAt: number;
}

interface UsernameCacheEntry {
  username: string;
  expiresAt: number;
}

const stateByUser = new Map<string, DialogState>();
const pendingFirstMessage = new Map<string, PendingFirstMessage>();
const usernameCache = new Map<string, UsernameCacheEntry>();

interface MessagingEvent {
  sender?: { id: string };
  message?: {
    text?: string;
    is_echo?: boolean;
    quick_reply?: { payload?: string };
  };
  postback?: { payload?: string };
}

function getUserState(senderId: string): DialogState {
  return stateByUser.get(senderId) ?? "IDLE";
}

function setUserState(senderId: string, state: DialogState) {
  stateByUser.set(senderId, state);
}

function clearPendingIfExpired(senderId: string) {
  const pending = pendingFirstMessage.get(senderId);
  if (!pending) return;
  if (pending.expiresAt <= Date.now()) {
    pendingFirstMessage.delete(senderId);
  }
}

function setPendingFirstMessage(senderId: string, intent: IntentType) {
  pendingFirstMessage.set(senderId, {
    intent,
    expiresAt: Date.now() + TEN_MINUTES_MS,
  });
}

function consumePendingFirstMessage(senderId: string): PendingFirstMessage | undefined {
  clearPendingIfExpired(senderId);
  const pending = pendingFirstMessage.get(senderId);
  if (!pending) return undefined;

  pendingFirstMessage.delete(senderId);
  return pending;
}

function resolveIntent(event: MessagingEvent, normalizedText?: string): IntentType | null {
  const payload = event.message?.quick_reply?.payload ?? event.postback?.payload;

  if (payload === "BOOK") return "BOOK";
  if (payload === "LOST") return "LOST";

  if (!normalizedText) return null;

  if (normalizedText.includes("забронировать стол") || normalizedText.includes("забронировать столик")) {
    return "BOOK";
  }

  if (normalizedText.includes("найти вещь")) {
    return "LOST";
  }

  return null;
}

async function fetchInstagramUsername(senderId: string) {
  const cached = usernameCache.get(senderId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.username;
  }

  const url = `https://graph.instagram.com/${senderId}?fields=username&access_token=${IG_ACCESS_TOKEN}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      console.error("IG username fetch error:", errText);
      return undefined;
    }

    const data = (await res.json()) as { username?: string };
    if (!data.username) {
      return undefined;
    }

    usernameCache.set(senderId, {
      username: data.username,
      expiresAt: Date.now() + ONE_DAY_MS,
    });

    return data.username;
  } catch (error) {
    console.error("IG username fetch exception:", error);
    return undefined;
  }
}

export async function sendToInstagram(payload: Record<string, unknown>) {
  const url = `https://graph.instagram.com/v21.0/${IG_USER_ID}/messages?access_token=${IG_ACCESS_TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("IG send error:", text);
  }

  return res;
}

export async function sendMenu(recipientId: string) {
  return sendToInstagram({
    recipient: { id: recipientId },
    message: {
      text: "Здравствуйте, спасибо за обращение в наш бар. Что вы хотите сделать?",
      quick_replies: [
        { content_type: "text", title: "Забронировать стол", payload: "BOOK" },
        { content_type: "text", title: "Найти вещь", payload: "LOST" },
      ],
    },
  });
}

export async function sendText(recipientId: string, text: string) {
  return sendToInstagram({
    recipient: { id: recipientId },
    message: { text },
  });
}

export async function handleWebhookEvent(event: MessagingEvent) {
  const senderId = event.sender?.id;
  const text = event.message?.text?.trim();
  const normalizedText = text?.toLowerCase();

  // Critical pre-filtering
  if (!senderId) return;
  if (senderId === IG_USER_ID) return;
  if (event.message?.is_echo) return;

  const payload = event.message?.quick_reply?.payload ?? event.postback?.payload;
  if (!text && !payload) return;

  const state = getUserState(senderId);

  if (normalizedText === "меню" || normalizedText === "назад") {
    setUserState(senderId, "IDLE");
    pendingFirstMessage.delete(senderId);
    await sendMenu(senderId);
    return;
  }

  const intent = resolveIntent(event, normalizedText);
  if (intent === "BOOK") {
    setUserState(senderId, "WAIT_BOOK_DETAILS");
    setPendingFirstMessage(senderId, "BOOK");
    await sendText(senderId, "Отлично! Напишите одним сообщением: дата, время, количество гостей, имя и номер телефона.");
    return;
  }

  if (intent === "LOST") {
    setUserState(senderId, "WAIT_LOST_DETAILS");
    setPendingFirstMessage(senderId, "LOST");
    await sendText(senderId, "Пожалуйста, опишите вещь: что это, цвет/бренд, когда были у нас и где примерно сидели.");
    return;
  }

  if (!text) return;

  if (state === "WAIT_BOOK_DETAILS" || state === "WAIT_LOST_DETAILS") {
    const pending = consumePendingFirstMessage(senderId);

    if (pending) {
      const username = await fetchInstagramUsername(senderId);
      await notifyTelegram({
        intent: pending.intent,
        username,
        message: text,
      });
    }

    await sendText(senderId, "Спасибо! Передали информацию менеджеру. Скоро с вами свяжемся.");
    setUserState(senderId, "IDLE");
    return;
  }

  if (state === "IDLE" && text) {
    await sendMenu(senderId);
  }
}
