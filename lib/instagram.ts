const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN!;
const IG_USER_ID = process.env.IG_USER_ID!;
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

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
        { content_type: "text", title: "Связаться с человеком", payload: "HUMAN" },
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

export async function notifyTelegram(text: string) {
  const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("TG send error:", errText);
  }
  return res;
}

interface MessagingEvent {
  sender?: { id: string };
  message?: { text?: string };
}

export async function handleWebhookEvent(event: MessagingEvent) {
  const senderId = event.sender?.id;
  const text = event.message?.text?.trim();

  if (!senderId) return;

  if (!text) {
    await notifyTelegram(`IG: новое сообщение (не текст)\nОт: ${senderId}`);
    return;
  }

  if (text.toLowerCase() === "меню" || text.toLowerCase() === "start") {
    await sendMenu(senderId);
    return;
  }

  const t = text.toLowerCase();

  if (t.includes("связаться") || t.includes("человек")) {
    await sendText(senderId, "Ок! Передаю менеджеру. Напишите, пожалуйста, ваш вопрос одним сообщением.");
    await notifyTelegram(`Запрос "связаться с человеком"\nОт (IG scoped id): ${senderId}\nТекст: ${text}`);
    return;
  }

  if (t.includes("забронировать") || t.includes("бронь")) {
    await sendText(senderId, "Для брони напишите: дата, время, сколько гостей, имя и номер телефона.");
    return;
  }

  if (t.includes("найти") || t.includes("вещь")) {
    await sendText(senderId, "Опишите вещь (что/цвет/бренд), когда были у нас и где примерно сидели.");
    return;
  }

  await sendMenu(senderId);
}
