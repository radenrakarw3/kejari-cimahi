import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, disposisi, bidang, ptspAppointments, ptspVisitLogs, reports } from "@/lib/schema";
import { persistPtspVerificationFiles } from "@/lib/ptsp-files";
import { createReportAuditLog } from "@/lib/report-audit";
import { requirePtspAccess } from "@/lib/ptsp-auth";
import { generateVisitorCardNumber } from "@/lib/ptsp";

export async function POST(req: NextRequest) {
  const unauthorized = await requirePtspAccess();
  if (unauthorized) return unauthorized;

  try {
    const formData = await req.formData();
    const visitorName = String(formData.get("visitorName") ?? "").trim();
    const visitorPhone = String(formData.get("visitorPhone") ?? "").trim();
    const reportNumber = String(formData.get("reportNumber") ?? "").trim().toUpperCase();
    const note = String(formData.get("note") ?? "").trim();
    const targetName = String(formData.get("targetName") ?? "").trim();
    const bidangIdRaw = String(formData.get("bidangId") ?? "").trim();
    const appointmentIdRaw = String(formData.get("appointmentId") ?? "").trim();
    const isIncognito = formData.get("isIncognito") === "true";
    const ktpPhoto = formData.get("ktpPhoto");
    const webcamPhoto = formData.get("webcamPhoto");

    if (!visitorName || !reportNumber) {
      return NextResponse.json({ error: "Nama tamu dan nomor laporan wajib diisi" }, { status: 400 });
    }

    if (!(ktpPhoto instanceof File) || ktpPhoto.size === 0) {
      return NextResponse.json({ error: "Foto KTP wajib diunggah" }, { status: 400 });
    }

    if (!(webcamPhoto instanceof File) || webcamPhoto.size === 0) {
      return NextResponse.json({ error: "Foto webcam wajib diambil" }, { status: 400 });
    }

    const [report] = await db
      .select({
        id: reports.id,
        nomorLaporan: reports.nomorLaporan,
        nama: reports.nama,
        status: reports.status,
        kategoriNama: categories.nama,
      })
      .from(reports)
      .leftJoin(categories, eq(reports.kategoriId, categories.id))
      .where(eq(reports.nomorLaporan, reportNumber))
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: "Nomor laporan tidak ditemukan" }, { status: 404 });
    }

    const savedFiles = await persistPtspVerificationFiles({
      ktpPhoto,
      webcamPhoto,
    });
    const visitorCardNumber = await generateVisitorCardNumber();
    const bidangId = bidangIdRaw ? Number(bidangIdRaw) : null;
    const appointmentId = appointmentIdRaw ? Number(appointmentIdRaw) : null;

    const [visitLog] = await db
      .insert(ptspVisitLogs)
      .values({
        serviceType: "follow_up",
        reportId: report.id,
        reportNumber,
        visitorCardNumber,
        visitorName,
        visitorPhone,
        bidangId,
        targetName: targetName || null,
        isIncognito,
        appointmentId,
        note: note || null,
        ktpFilePath: savedFiles.ktpFilePath,
        webcamFilePath: savedFiles.webcamFilePath,
      })
      .returning();

    if (appointmentId) {
      await db
        .update(ptspAppointments)
        .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(ptspAppointments.id, appointmentId));
    }

    const [latestDisposisi] = await db
      .select({
        bidangNama: bidang.nama,
      })
      .from(disposisi)
      .leftJoin(bidang, eq(disposisi.bidangId, bidang.id))
      .where(eq(disposisi.reportId, report.id))
      .orderBy(desc(disposisi.disposedAt))
      .limit(1);

    await createReportAuditLog({
      reportId: report.id,
      action: "ptsp_follow_up_visit",
      actorType: "admin",
      actorName: "PTSP Lobby",
      summary: `Kunjungan PTSP untuk menanyakan tindak lanjut laporan oleh ${visitorName}`,
      metadata: {
        visitorName,
        visitorPhone: visitorPhone || null,
        reportNumber,
        note: note || null,
        bidangNama: latestDisposisi?.bidangNama ?? null,
        visitorCardNumber,
        targetName: targetName || null,
        bidangId,
        isIncognito,
        appointmentId,
      },
    });

    return NextResponse.json({
      id: visitLog.id,
      reportId: report.id,
      reportNumber: report.nomorLaporan,
      visitorCardNumber,
    });
  } catch (error) {
    console.error("POST /api/ptsp/follow-up error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
