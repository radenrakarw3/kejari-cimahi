import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { waLogs } from "@/lib/schema";
import { normalizePhone, sendWhatsApp } from "@/lib/whatsapp";
import { answerWhatsAppFromKnowledge } from "@/lib/ai";

function getWebhookSecret(req: NextRequest, body?: unknown): string | null {
  const headerSecret = req.headers.get("x-webhook-secret");
  if (headerSecret) return headerSecret;

  const querySecret = req.nextUrl.searchParams.get("secret");
  if (querySecret) return querySecret;

  if (body && typeof body === "object" && "secret" in body) {
    const bodySecret = (body as { secret?: unknown }).secret;
    return typeof bodySecret === "string" ? bodySecret : null;
  }

  if (body && typeof body === "object" && "data" in body) {
    const nestedData = (body as { data?: unknown }).data;
    if (nestedData && typeof nestedData === "object" && "secret" in nestedData) {
      const nestedSecret = (nestedData as { secret?: unknown }).secret;
      return typeof nestedSecret === "string" ? nestedSecret : null;
    }
  }

  return null;
}

function getPayloadValue(body: unknown, keys: string[]): string {
  if (!body || typeof body !== "object") {
    return "";
  }

  const payload = body as Record<string, unknown>;
  const data =
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : null;

  for (const key of keys) {
    const directValue = payload[key];
    if (typeof directValue === "string" && directValue.trim()) {
      return directValue;
    }

    const nestedValue = data?.[key];
    if (typeof nestedValue === "string" && nestedValue.trim()) {
      return nestedValue;
    }
  }

  return "";
}

async function sendAndLogMessage(params: {
  from: string;
  phoneNumber: string;
  content: string;
  sentBy?: "ai" | "system";
}) {
  const sendResult = await sendWhatsApp(params.from, params.content);

  await db.insert(waLogs).values({
    direction: "outbound",
    content: params.content,
    phoneNumber: params.phoneNumber,
    status: sendResult.success ? "sent" : "failed",
    sentBy: params.sentBy ?? "ai",
  });

  return sendResult;
}

export async function GET(req: NextRequest) {
  const providedSecret = getWebhookSecret(req);
  const configuredSecret = process.env.WEBHOOK_SECRET;

  if (configuredSecret && providedSecret !== configuredSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    service: "whatsapp-webhook",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const configuredSecret = process.env.WEBHOOK_SECRET;
  const providedSecret = getWebhookSecret(req, body);

  if (configuredSecret && providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const event = getPayloadValue(body, ["event", "type"]);
    const from = getPayloadValue(body, ["from", "sender", "phone", "number"]);
    const messageText = getPayloadValue(body, ["body", "message", "text"]);

    if (event && !["message", "messages.upsert", "incoming_message"].includes(event)) {
      return NextResponse.json({ ok: true, ignored: true, event });
    }

    if (!from || !messageText) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const phoneNumber = normalizePhone(from);
    const cleanedMessage = messageText.trim();

    await db.insert(waLogs).values({
      direction: "inbound",
      content: cleanedMessage,
      phoneNumber,
      status: "received",
      sentBy: "system",
    });

    const historyLogs = await db
      .select({
        direction: waLogs.direction,
        content: waLogs.content,
      })
      .from(waLogs)
      .where(eq(waLogs.phoneNumber, phoneNumber))
      .orderBy(desc(waLogs.timestamp))
      .limit(8);

    const history = historyLogs
      .reverse()
      .map((log) => ({
        role: (log.direction === "inbound" ? "user" : "admin") as "user" | "admin",
        content: log.content,
      }));

    const appUrl =
      process.env.BETTER_AUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";
    const reportFormUrl =
      process.env.WHATSAPP_REPORT_FORM_URL ??
      "https://kejari-cimahi-production.up.railway.app/lapor";
    const answer = await answerWhatsAppFromKnowledge({
      message: cleanedMessage,
      history,
      appUrl,
      reportFormUrl,
    });

    await sendAndLogMessage({
      from,
      phoneNumber,
      content: answer.reply,
      sentBy: "ai",
    });

    return NextResponse.json({
      ok: true,
      mode: answer.routeToReportForm ? "report-link" : "knowledge-reply",
      usedKnowledge: answer.usedKnowledge,
    });
  } catch (err) {
    console.error("WA webhook error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
