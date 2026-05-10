import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ptspAppointments, ptspVisitLogs } from "@/lib/schema";
import { persistPtspVerificationFiles } from "@/lib/ptsp-files";
import { generateVisitorCardNumber } from "@/lib/ptsp";
import { requirePtspAccess } from "@/lib/ptsp-auth";

export async function POST(req: NextRequest) {
  const unauthorized = await requirePtspAccess();
  if (unauthorized) return unauthorized;

  try {
    const formData = await req.formData();
    const visitorName = String(formData.get("visitorName") ?? "").trim();
    const visitorPhone = String(formData.get("visitorPhone") ?? "").trim();
    const targetName = String(formData.get("targetName") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    const bidangIdRaw = String(formData.get("bidangId") ?? "").trim();
    const appointmentIdRaw = String(formData.get("appointmentId") ?? "").trim();
    const isIncognito = formData.get("isIncognito") === "true";
    const ktpPhoto = formData.get("ktpPhoto");
    const webcamPhoto = formData.get("webcamPhoto");

    if (!visitorName) {
      return NextResponse.json({ error: "Nama tamu wajib diisi" }, { status: 400 });
    }

    if (!(ktpPhoto instanceof File) || !(webcamPhoto instanceof File)) {
      return NextResponse.json({ error: "Foto KTP dan webcam wajib diunggah" }, { status: 400 });
    }

    const visitorCardNumber = await generateVisitorCardNumber();
    const savedVerification = await persistPtspVerificationFiles({ ktpPhoto, webcamPhoto });
    const bidangId = bidangIdRaw ? Number(bidangIdRaw) : null;
    const appointmentId = appointmentIdRaw ? Number(appointmentIdRaw) : null;

    const [visit] = await db
      .insert(ptspVisitLogs)
      .values({
        serviceType: "guestbook",
        visitorCardNumber,
        visitorName,
        visitorPhone: visitorPhone || null,
        bidangId,
        targetName: targetName || null,
        isIncognito,
        appointmentId,
        note: note || null,
        ktpFilePath: savedVerification.ktpFilePath,
        webcamFilePath: savedVerification.webcamFilePath,
      })
      .returning({ id: ptspVisitLogs.id });

    if (appointmentId) {
      await db
        .update(ptspAppointments)
        .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(ptspAppointments.id, appointmentId));
    }

    return NextResponse.json({ id: visit.id, visitorCardNumber }, { status: 201 });
  } catch (error) {
    console.error("POST /api/ptsp/guestbook error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
