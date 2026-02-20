"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface StatusData {
  configured: boolean;
  webhookUrl: string;
  recentEvents: Array<{ timestamp: string; senderId: string; text: string }>;
}

export function Dashboard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      console.error("Failed to fetch status");
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSendText = async () => {
    if (!recipientId || !messageText) return;
    setSending(true);
    setSendResult("");
    try {
      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, text: messageText }),
      });
      const data = await res.json();
      setSendResult(res.ok ? "Отправлено" : data.error || "Ошибка");
    } catch {
      setSendResult("Ошибка сети");
    }
    setSending(false);
  };

  const handleSendMenu = async () => {
    if (!recipientId) return;
    setSending(true);
    setSendResult("");
    try {
      const res = await fetch("/api/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, type: "menu" }),
      });
      const data = await res.json();
      setSendResult(res.ok ? "Меню отправлено" : data.error || "Ошибка");
    } catch {
      setSendResult("Ошибка сети");
    }
    setSending(false);
  };

  return (
    <div className="flex min-h-screen flex-col gap-6 p-6 md:p-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-balance">Instagram Bot</h1>
        <p className="text-muted-foreground">Панель управления ботом</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Статус</CardTitle>
            <CardDescription>Состояние бота и webhook</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Конфигурация:</span>
              {status?.configured ? (
                <Badge variant="default">Настроено</Badge>
              ) : (
                <Badge variant="destructive">Не настроено</Badge>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Webhook URL:</span>
              <code className="rounded-md bg-muted px-2 py-1 text-xs break-all text-muted-foreground">
                {status?.webhookUrl || "Загрузка..."}
              </code>
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Необходимые переменные окружения:</span>
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                <li><code>VERIFY_TOKEN</code> -- токен верификации Meta webhook</li>
                <li><code>TELEGRAM_BOT_TOKEN</code> -- токен Telegram бота</li>
                <li><code>TELEGRAM_CHAT_ID</code> -- ID чата для уведомлений</li>
                <li><code>IG_ACCESS_TOKEN</code> -- токен Instagram API</li>
                <li><code>IG_USER_ID</code> -- ID пользователя Instagram</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Send message */}
        <Card>
          <CardHeader>
            <CardTitle>Отправить сообщение</CardTitle>
            <CardDescription>Ручная отправка в Instagram DM</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="recipientId">Instagram Scoped ID</Label>
              <Input
                id="recipientId"
                placeholder="Вставьте ID получателя"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="messageText">Текст сообщения</Label>
              <Input
                id="messageText"
                placeholder="Введите сообщение"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSendText} disabled={sending || !recipientId || !messageText}>
                Отправить текст
              </Button>
              <Button variant="outline" onClick={handleSendMenu} disabled={sending || !recipientId}>
                Отправить меню
              </Button>
            </div>
            {sendResult && (
              <p className="text-sm text-muted-foreground">{sendResult}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent events */}
      <Card>
        <CardHeader>
          <CardTitle>Последние сообщения</CardTitle>
          <CardDescription>Входящие сообщения через webhook (обновление каждые 5 сек)</CardDescription>
        </CardHeader>
        <CardContent>
          {!status?.recentEvents?.length ? (
            <p className="text-sm text-muted-foreground">Пока нет сообщений</p>
          ) : (
            <div className="flex flex-col gap-3">
              {status.recentEvents.map((ev, i) => (
                <div key={i} className="flex flex-col gap-1 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {new Date(ev.timestamp).toLocaleString("ru-RU")}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {ev.senderId}
                    </Badge>
                  </div>
                  <p className="text-sm">{ev.text}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
