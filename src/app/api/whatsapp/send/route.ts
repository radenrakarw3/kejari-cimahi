import { NextRequest, NextResponse } from "next/server";
import { sendWhatsApp, normalizePhone } from "@/lib/whatsapp";
import { db } from "@/lib/db";
import { waLogs } from "@/lib/schema";
import { auth } from "@/lib/auth";

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
