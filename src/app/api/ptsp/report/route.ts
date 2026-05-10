import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { categories, ptspAppointments, ptspVisitLogs, reportAttachments, reports } from "@/lib/schema";
import { generateNomorLaporan } from "@/lib/nomor-laporan";
import { normalizePhone } from "@/lib/whatsapp";
import { persistPtspVerificationFiles } from "@/lib/ptsp-files";
import { persistReportAttachments } from "@/lib/report-files";
import { generateVisitorCardNumber } from "@/lib/ptsp";
import { requirePtspAccess } from "@/lib/ptsp-auth";
import { createReportAuditLog } from "@/lib/report-audit";

const offlineSchema = z.object({
  nama: z.string().min(3),
  nomorWa: z
    .string()
    .regex(/^(08|628)\d{8,12}$/)
    .or(z.string().length(0)),
  kelurahan: z.string().min(1),
  rw: z.string().min(1),
  isiLaporan: z.string().min(20).max(2000),
});

export async function POST(req: NextRequest) {
  const unauthorized = await requirePtspAccess();
  if (unauthorized) return unauthorized;

  try {
    const formData = await req.formData();
    const parsed = offlineSchema.safeParse({
      nama: String(formData.get("nama") ?? ""),
      nomorWa: String(formData.get("nomorWa") ?? ""),
      kelurahan: String(formData.get("kelurahan") ?? ""),
      rw: String(formData.get("rw") ?? ""),
      isiLaporan: String(formData.get("isiLaporan") ?? ""),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Validasi gagal", details: parsed.error.flatten() }, { status: 400 });
    }

    const kategoriIdRaw = String(formData.get("kategoriId") ?? "");
    const kategoriId = kategoriIdRaw ? Number(kategoriIdRaw) : null;
    const visitorName = String(formData.get("visitorName") ?? parsed.data.nama).trim();
    const visitorPhone = String(formData.get("visitorPhone") ?? parsed.data.nomorWa).trim();
    const targetName = String(formData.get("targetName") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    const appointmentIdRaw = String(formData.get("appointmentId") ?? "").trim();
    const appointmentId = appointmentIdRaw ? Number(appointmentIdRaw) : null;
    const bidangIdRaw = String(formData.get("bidangId") ?? "").trim();
    const bidangId = bidangIdRaw ? Number(bidangIdRaw) : null;
    const isIncognito = formData.get("isIncognito") === "true";
    const ktpPhoto = formData.get("ktpPhoto");
    const webcamPhoto = formData.get("webcamPhoto");
    const extraAttachments = formData
      .getAll("attachments")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (!(ktpPhoto instanceof File) || !(webcamPhoto instanceof File)) {
      return NextResponse.json({ error: "Foto KTP dan webcam wajib diunggah" }, { status: 400 });
    }

    if (kategoriId !== null) {
      const [selectedCategory] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, kategoriId))
        .limit(1);

      if (!selectedCategory) {
        return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 400 });
      }
    }

    const nomorLaporan = await generateNomorLaporan();
    const visitorCardNumber = await generateVisitorCardNumber();
    const normalizedWa = parsed.data.nomorWa ? normalizePhone(parsed.data.nomorWa) : "";

    const [report] = await db
      .insert(reports)
      .values({
        nama: parsed.data.nama,
        nomorWa: normalizedWa,
        kelurahan: parsed.data.kelurahan,
        rw: parsed.data.rw,
        isiLaporan: parsed.data.isiLaporan,
        kategoriId,
        nomorLaporan,
        source: "offline",
        status: "masuk",
      })
      .returning();

    const savedVerification = await persistPtspVerificationFiles({ ktpPhoto, webcamPhoto });
    const mergedAttachments = [ktpPhoto, webcamPhoto, ...extraAttachments];
    const savedAttachments = await persistReportAttachments(report.id, mergedAttachments);
    if (savedAttachments.length > 0) {
      await db.insert(reportAttachments).values(savedAttachments);
    }

    await db.insert(ptspVisitLogs).values({
      serviceType: "report",
      reportId: report.id,
      reportNumber: nomorLaporan,
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
    });

    if (appointmentId) {
      await db
        .update(ptspAppointments)
        .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(ptspAppointments.id, appointmentId));
    }

    await createReportAuditLog({
      reportId: report.id,
      action: "ptsp_report_created",
      actorType: "admin",
      actorName: "PTSP Front Desk",
      summary: `Laporan offline dibuat melalui PTSP dengan kartu visitor ${visitorCardNumber}`,
      metadata: {
        visitorName,
        visitorPhone,
        targetName,
        bidangId,
        isIncognito,
        appointmentId,
      },
    });

    return NextResponse.json(
      { id: report.id, nomorLaporan, visitorCardNumber },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/ptsp/report error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
