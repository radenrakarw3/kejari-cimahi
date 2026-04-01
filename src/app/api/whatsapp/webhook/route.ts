import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports, waLogs } from "@/lib/schema";
import { normalizePhone, sendWhatsApp, buildConfirmationMessage } from "@/lib/whatsapp";
import { broadcastSseEvent } from "@/lib/sse";
import { generateNomorLaporan } from "@/lib/nomor-laporan";
import { generateWebhookReply } from "@/lib/ai";
import { eq, and, inArray } from "drizzle-orm";

function getWebhookSecret(req: NextRequest, body?: unknown) {
  if (req.headers.get("x-webhook-secret")) {
    return req.headers.get("x-webhook-secret");
  }

  const querySecret = req.nextUrl.searchParams.get("secret");
  if (querySecret) {
    return querySecret;
  }

  if (body && typeof body === "object" && "secret" in body) {
    const bodySecret = (body as { secret?: unknown }).secret;
    return typeof bodySecret === "string" ? bodySecret : null;
  }

  return null;
}

function getPayloadValue(body: unknown, keys: string[]) {
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
    // StarSender webhook payload shape:
    // { event: "message", data: { from, body, messageId, timestamp } }
    const event = getPayloadValue(body, ["event", "type"]);
    const from = getPayloadValue(body, ["from", "sender", "phone", "number"]);
    const messageText = getPayloadValue(body, ["body", "message", "text"]);
    const messageId = getPayloadValue(body, ["messageId", "id"]);

    if (event && !["message", "messages.upsert", "incoming_message"].includes(event)) {
      return NextResponse.json({ ok: true, ignored: true, event });
    }

    if (!from || !messageText) {
      return NextResponse.json({ ok: true }); // ignore empty
    }

    const phoneNormalized = normalizePhone(from);

    // Check if this phone has an existing open report
    const existingReports = await db
      .select()
      .from(reports)
      .where(
        and(
          eq(reports.nomorWa, phoneNormalized),
          inArray(reports.status, ["masuk", "diproses"])
        )
      )
      .limit(1);

    if (existingReports.length > 0) {
      const existingReport = existingReports[0];

      // Log as incoming message on existing report
      await db.insert(waLogs).values({
        reportId: existingReport.id,
        direction: "inbound",
        content: messageText,
        phoneNumber: phoneNormalized,
        status: "received",
      });

      const aiReply = await generateWebhookReply({
        message: messageText,
        nomorLaporan: existingReport.nomorLaporan,
        isExistingReport: true,
      });

      const sendResult = await sendWhatsApp(from, aiReply);

      await db.insert(waLogs).values({
        reportId: existingReport.id,
        direction: "outbound",
        content: aiReply,
        phoneNumber: phoneNormalized,
        status: sendResult.success ? "sent" : "failed",
        sentBy: "ai",
      });

      broadcastSseEvent({
        type: "new_wa_message",
        reportId: existingReport.id,
        message: messageText,
      });
    } else {
      // Create new report from WA
      const nomorLaporan = await generateNomorLaporan();
      const [newReport] = await db
        .insert(reports)
        .values({
          nomorLaporan,
          nama: "Pelapor via WhatsApp",
          nomorWa: phoneNormalized,
          kelurahan: "Belum Diisi",
          rw: "Belum Diisi",
          isiLaporan: messageText,
          source: "wa",
          waMessageId: messageId,
          status: "masuk",
        })
        .returning();

      await db.insert(waLogs).values({
        reportId: newReport.id,
        direction: "inbound",
        content: messageText,
        phoneNumber: phoneNormalized,
        status: "received",
      });

      // Auto-reply with AI confirmation
      const aiReply = await generateWebhookReply({
        message: messageText,
        nomorLaporan: newReport.nomorLaporan,
        isExistingReport: false,
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const surveyUrl = `${appUrl}/survey/${newReport.id}`;
      const confirmationMessage = `${buildConfirmationMessage("Anda", newReport.nomorLaporan, surveyUrl)}\n\n${aiReply}`;
      const sendResult = await sendWhatsApp(from, confirmationMessage);

      await db.insert(waLogs).values({
        reportId: newReport.id,
        direction: "outbound",
        content: confirmationMessage,
        phoneNumber: phoneNormalized,
        status: sendResult.success ? "sent" : "failed",
        sentBy: "ai",
      });

      // AI categorization
      fetch(`${appUrl}/api/ai/categorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: newReport.id,
          isiLaporan: newReport.isiLaporan,
        }),
      }).catch(() => {});

      broadcastSseEvent({ type: "new_report", report: newReport });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("WA webhook error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
