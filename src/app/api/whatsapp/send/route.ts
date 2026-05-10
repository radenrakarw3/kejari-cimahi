import { NextRequest, NextResponse } from "next/server";
import { sendWhatsApp, normalizePhone } from "@/lib/whatsapp";
import { db } from "@/lib/db";
import { waLogs } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { createReportAuditLog } from "@/lib/report-audit";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { phoneNumber, message, reportId } = await req.json();

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: "phoneNumber and message are required" },
        { status: 400 }
      );
    }

    const result = await sendWhatsApp(phoneNumber, message);

    // Log to wa_logs
    await db.insert(waLogs).values({
      reportId: reportId ?? null,
      direction: "outbound",
      content: message,
      phoneNumber: normalizePhone(phoneNumber),
      status: result.success ? "sent" : "failed",
    });

    if (reportId) {
      await createReportAuditLog({
        reportId,
        action: "manual_whatsapp_sent",
        actorType: "admin",
        actorId: session.user.id,
        actorName: session.user.name,
        summary: result.success ? "Pesan WhatsApp manual dikirim ke pelapor" : "Percobaan kirim WhatsApp manual gagal",
        metadata: {
          phoneNumber: normalizePhone(phoneNumber),
          status: result.success ? "sent" : "failed",
        },
      });
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("WA send error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
