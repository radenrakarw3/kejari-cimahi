import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports, waLogs } from "@/lib/schema";
import { normalizePhone, sendWhatsApp, buildConfirmationMessage } from "@/lib/whatsapp";
import { broadcastSseEvent } from "@/lib/sse";
import { generateNomorLaporan } from "@/lib/nomor-laporan";
import { generateWebhookReply } from "@/lib/ai";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // StarSender webhook payload shape:
    // { event: "message", data: { from, body, messageId, timestamp } }
    const from: string = body?.data?.from ?? body?.from ?? "";
    const messageText: string = body?.data?.body ?? body?.body ?? "";
    const messageId: string = body?.data?.messageId ?? body?.messageId ?? "";

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

      const confirmationMessage = `${buildConfirmationMessage("Anda", newReport.nomorLaporan)}\n\n${aiReply}`;
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
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
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
