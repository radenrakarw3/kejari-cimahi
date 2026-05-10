import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports, categories, disposisi, waLogs, bidang, user } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { broadcastSseEvent } from "@/lib/sse";
import { getAuthenticatedUser } from "@/lib/authz";
import { createReportAuditLog } from "@/lib/report-audit";
import {
  buildAdditionalInfoRequestMessage,
  buildBidangDisposisiNotification,
  buildDisposisiMessage,
  buildProsesMessage,
  buildSelesaiMessage,
  normalizePhone,
  sendWhatsApp,
} from "@/lib/whatsapp";

const OUTCOME_TYPES = [
  "ditindaklanjuti",
  "diteruskan",
  "bukan_kewenangan",
  "butuh_data_tambahan",
  "selesai_konsultasi",
] as const;

async function sendStatusNotification(params: {
  reportId: number;
  phoneNumber: string;
  message: string;
}) {
  const result = await sendWhatsApp(params.phoneNumber, params.message);

  await db.insert(waLogs).values({
    reportId: params.reportId,
    direction: "outbound",
    content: params.message,
    phoneNumber: normalizePhone(params.phoneNumber),
    status: result.success ? "sent" : "failed",
    sentBy: "system",
  });

  if (!result.success) {
    console.error("Failed to send report status notification:", result.error);
  }

  return result;
}

async function sendBidangNotification(phoneNumber: string, message: string) {
  const result = await sendWhatsApp(phoneNumber, message);
  if (!result.success) {
    console.error("Failed to send bidang notification:", result.error);
  }
  return result;
}

function hasPelaporPhone(phoneNumber: string | null | undefined) {
  return typeof phoneNumber === "string" && phoneNumber.trim().length >= 10;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getAuthenticatedUser(req.headers);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const reportId = parseInt(id);

  const [report] = await db
    .select({
      id: reports.id,
      nomorLaporan: reports.nomorLaporan,
      nama: reports.nama,
      nomorWa: reports.nomorWa,
      kelurahan: reports.kelurahan,
      rw: reports.rw,
      isiLaporan: reports.isiLaporan,
      status: reports.status,
      source: reports.source,
      createdAt: reports.createdAt,
      updatedAt: reports.updatedAt,
      kategoriId: reports.kategoriId,
      kategoriNama: categories.nama,
      kategoriWarna: categories.warna,
      kategoriKode: categories.kode,
      kategoriIcon: categories.icon,
    })
    .from(reports)
    .leftJoin(categories, eq(reports.kategoriId, categories.id))
    .where(eq(reports.id, reportId));

  if (!report) {
    return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
  }

  if (currentUser.bidangId) {
    const [latestDisposisi] = await db
      .select({
        bidangId: disposisi.bidangId,
      })
      .from(disposisi)
      .where(eq(disposisi.reportId, reportId))
      .orderBy(desc(disposisi.id))
      .limit(1);

    if (!latestDisposisi || latestDisposisi.bidangId !== currentUser.bidangId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const [disposisiList, waLogsList] = await Promise.all([
    db
      .select({
        id: disposisi.id,
        catatan: disposisi.catatan,
        disposedAt: disposisi.disposedAt,
        disposedBy: disposisi.disposedBy,
        bidangId: disposisi.bidangId,
        bidangNama: bidang.nama,
        bidangKode: bidang.kode,
      })
      .from(disposisi)
      .leftJoin(bidang, eq(disposisi.bidangId, bidang.id))
      .where(eq(disposisi.reportId, reportId))
      .orderBy(desc(disposisi.disposedAt)),
    db
      .select()
      .from(waLogs)
      .where(eq(waLogs.reportId, reportId))
      .orderBy(waLogs.timestamp),
  ]);

  return NextResponse.json({ report, disposisiList, waLogsList });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getAuthenticatedUser(req.headers);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const reportId = parseInt(id);
  const body = await req.json();
  const isBidangUser = currentUser.bidangId !== null;

  const [report] = await db
    .select({
      id: reports.id,
      nama: reports.nama,
      nomorWa: reports.nomorWa,
      nomorLaporan: reports.nomorLaporan,
      isiLaporan: reports.isiLaporan,
      status: reports.status,
      kategoriId: reports.kategoriId,
      priorityLevel: reports.priorityLevel,
      priorityReason: reports.priorityReason,
      outcomeType: reports.outcomeType,
      outcomeSummary: reports.outcomeSummary,
      outcomeFollowUp: reports.outcomeFollowUp,
      additionalInfoRequest: reports.additionalInfoRequest,
      additionalInfoRequestedAt: reports.additionalInfoRequestedAt,
    })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1);

  if (!report) {
    return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
  }

  const [latestDisposisi] = await db
    .select({
      bidangId: disposisi.bidangId,
      bidangNama: bidang.nama,
    })
    .from(disposisi)
    .leftJoin(bidang, eq(disposisi.bidangId, bidang.id))
    .where(eq(disposisi.reportId, reportId))
    .orderBy(desc(disposisi.id))
    .limit(1);

  if (isBidangUser) {
    if (
      body.kategoriId !== undefined ||
      body.disposisi ||
      body.priority !== undefined ||
      body.requestMoreInfo !== undefined
    ) {
      return NextResponse.json({ error: "Aksi ini hanya untuk admin" }, { status: 403 });
    }

    if (!body.status || !["diproses", "selesai"].includes(body.status)) {
      return NextResponse.json({ error: "Status tidak diizinkan untuk bidang" }, { status: 403 });
    }

    if (!latestDisposisi || latestDisposisi.bidangId !== currentUser.bidangId) {
      return NextResponse.json({ error: "Laporan ini bukan disposisi bidang Anda" }, { status: 403 });
    }
  }

  if (body.status === "selesai") {
    if (!body.outcome || typeof body.outcome !== "object") {
      return NextResponse.json(
        { error: "Hasil penanganan wajib diisi sebelum menandai selesai" },
        { status: 400 }
      );
    }

    if (
      typeof body.outcome.type !== "string" ||
      !OUTCOME_TYPES.includes(body.outcome.type as (typeof OUTCOME_TYPES)[number])
    ) {
      return NextResponse.json({ error: "Jenis hasil penanganan tidak valid" }, { status: 400 });
    }

    if (
      typeof body.outcome.summary !== "string" ||
      body.outcome.summary.trim().length < 20
    ) {
      return NextResponse.json(
        { error: "Ringkasan hasil penanganan minimal 20 karakter" },
        { status: 400 }
      );
    }
  }

  if (body.requestMoreInfo !== undefined) {
    if (
      !body.requestMoreInfo ||
      typeof body.requestMoreInfo !== "object" ||
      typeof body.requestMoreInfo.message !== "string" ||
      body.requestMoreInfo.message.trim().length < 15
    ) {
      return NextResponse.json(
        { error: "Permintaan data tambahan minimal 15 karakter" },
        { status: 400 }
      );
    }

    if (!report.nomorWa) {
      return NextResponse.json(
        { error: "Laporan anonim atau tanpa nomor WhatsApp tidak bisa dimintai data tambahan" },
        { status: 400 }
      );
    }
  }

  // Update status
  if (body.status) {
    const previousStatus = report.status;
    const nextOutcome =
      body.status === "selesai" && body.outcome
        ? {
            outcomeType: body.outcome.type,
            outcomeSummary: body.outcome.summary.trim(),
            outcomeFollowUp:
              typeof body.outcome.followUp === "string" && body.outcome.followUp.trim()
                ? body.outcome.followUp.trim()
                : null,
          }
        : {};
    await db
      .update(reports)
      .set({ status: body.status, updatedAt: new Date(), ...nextOutcome })
      .where(eq(reports.id, reportId));
    broadcastSseEvent({ type: "report_updated", reportId, status: body.status });

    await createReportAuditLog({
      reportId,
      action: "status_changed",
      actorType: isBidangUser ? "bidang" : "admin",
      actorId: currentUser.id,
      actorName: currentUser.name,
      summary: `Status diubah dari ${previousStatus} menjadi ${body.status}`,
      metadata: {
        previousStatus,
        nextStatus: body.status,
        actorRole: currentUser.role,
        outcomeType: body.outcome?.type ?? null,
      },
    });

    if (body.status === "diproses" && hasPelaporPhone(report.nomorWa)) {
      const waResult = await sendStatusNotification({
        reportId,
        phoneNumber: report.nomorWa,
        message: buildProsesMessage(
          report.nama,
          report.nomorLaporan,
          latestDisposisi?.bidangNama ?? "seksi terkait"
        ),
      });

      await createReportAuditLog({
        reportId,
        action: waResult.success ? "wa_disposisi_progress_sent" : "wa_disposisi_progress_failed",
        actorType: "system",
        summary: waResult.success
          ? "Notifikasi WhatsApp proses laporan terkirim ke pelapor"
          : "Notifikasi WhatsApp proses laporan gagal dikirim ke pelapor",
        metadata: {
          phoneNumber: report.nomorWa,
          bidangNama: latestDisposisi?.bidangNama ?? "seksi terkait",
          error: waResult.error ?? null,
        },
      });
    }

    if (body.status === "selesai" && hasPelaporPhone(report.nomorWa)) {
      const waResult = await sendStatusNotification({
        reportId,
        phoneNumber: report.nomorWa,
        message: buildSelesaiMessage(
          report.nama,
          report.nomorLaporan,
          latestDisposisi?.bidangNama,
          body.outcome?.summary ?? null
        ),
      });

      await createReportAuditLog({
        reportId,
        action: waResult.success ? "wa_outcome_sent" : "wa_outcome_failed",
        actorType: "system",
        summary: waResult.success
          ? "Notifikasi WhatsApp hasil penanganan terkirim ke pelapor"
          : "Notifikasi WhatsApp hasil penanganan gagal dikirim ke pelapor",
        metadata: {
          phoneNumber: report.nomorWa,
          bidangNama: latestDisposisi?.bidangNama ?? null,
          error: waResult.error ?? null,
        },
      });

      await createReportAuditLog({
        reportId,
        action: "outcome_recorded",
        actorType: isBidangUser ? "bidang" : "admin",
        actorId: currentUser.id,
        actorName: currentUser.name,
        summary: "Hasil penanganan dicatat saat laporan diselesaikan",
        metadata: {
          outcomeType: body.outcome?.type ?? null,
          outcomeSummary: body.outcome?.summary ?? null,
          outcomeFollowUp: body.outcome?.followUp ?? null,
        },
      });
    }
  }

  if (body.requestMoreInfo) {
    const requestMessage = body.requestMoreInfo.message.trim();
    await db
      .update(reports)
      .set({
        status: "menunggu_data_tambahan",
        additionalInfoRequest: requestMessage,
        additionalInfoRequestedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reports.id, reportId));

    broadcastSseEvent({ type: "report_updated", reportId, status: "menunggu_data_tambahan" });

    await sendStatusNotification({
      reportId,
      phoneNumber: report.nomorWa,
      message: buildAdditionalInfoRequestMessage(report.nama, report.nomorLaporan, requestMessage),
    });

    await createReportAuditLog({
      reportId,
      action: "additional_info_requested",
      actorType: "admin",
      actorId: currentUser.id,
      actorName: currentUser.name,
      summary: "Admin meminta data tambahan kepada pelapor",
      metadata: {
        previousStatus: report.status,
        nextStatus: "menunggu_data_tambahan",
        message: requestMessage,
      },
    });
  }

  // Update kategori
  if (body.kategoriId !== undefined) {
    const previousKategoriId = report.kategoriId ?? null;
    await db
      .update(reports)
      .set({ kategoriId: body.kategoriId, updatedAt: new Date() })
      .where(eq(reports.id, reportId));

    await createReportAuditLog({
      reportId,
      action: "category_changed",
      actorType: isBidangUser ? "bidang" : "admin",
      actorId: currentUser.id,
      actorName: currentUser.name,
      summary: "Kategori laporan diperbarui",
      metadata: {
        previousKategoriId,
        nextKategoriId: body.kategoriId,
      },
    });
  }

  if (body.priority !== undefined) {
    if (
      !body.priority ||
      typeof body.priority !== "object" ||
      typeof body.priority.level !== "string" ||
      !["rendah", "normal", "penting", "mendesak", "kritis"].includes(body.priority.level)
    ) {
      return NextResponse.json({ error: "Prioritas laporan tidak valid" }, { status: 400 });
    }

    const nextPriorityReason =
      typeof body.priority.reason === "string" && body.priority.reason.trim()
        ? body.priority.reason.trim()
        : null;

    await db
      .update(reports)
      .set({
        priorityLevel: body.priority.level,
        priorityReason: nextPriorityReason,
        updatedAt: new Date(),
      })
      .where(eq(reports.id, reportId));

    await createReportAuditLog({
      reportId,
      action: "priority_changed",
      actorType: "admin",
      actorId: currentUser.id,
      actorName: currentUser.name,
      summary: `Prioritas laporan diubah dari ${report.priorityLevel} menjadi ${body.priority.level}`,
      metadata: {
        previousPriorityLevel: report.priorityLevel,
        nextPriorityLevel: body.priority.level,
        priorityReason: nextPriorityReason,
      },
    });
  }

  // Add disposisi
  if (body.disposisi) {
    const { bidangId, catatan } = body.disposisi;
    const [targetBidang] = await db
      .select({
        nama: bidang.nama,
      })
      .from(bidang)
      .where(eq(bidang.id, bidangId))
      .limit(1);

    const [targetBidangAdmin] = await db
      .select({
        phoneNumber: user.phoneNumber,
        name: user.name,
      })
      .from(user)
      .where(and(eq(user.role, "bidang"), eq(user.bidangId, bidangId)))
      .limit(1);

    await db.insert(disposisi).values({
      reportId,
      bidangId,
      catatan,
      disposedBy: currentUser.id,
    });
    await db
      .update(reports)
      .set({ status: "disposisi", updatedAt: new Date() })
      .where(eq(reports.id, reportId));
    broadcastSseEvent({ type: "report_updated", reportId, status: "disposisi" });

    await createReportAuditLog({
      reportId,
      action: "disposisi_created",
      actorType: "admin",
      actorId: currentUser.id,
      actorName: currentUser.name,
      summary: `Laporan didisposisikan ke ${targetBidang?.nama ?? `bidang #${bidangId}`}`,
      metadata: {
        bidangId,
        bidangNama: targetBidang?.nama ?? null,
        catatan: catatan ?? null,
      },
    });

    const bidangNamaUntukPelapor = targetBidang?.nama ?? "seksi terkait";
    const notificationJobs: Promise<void>[] = [];

    if (hasPelaporPhone(report.nomorWa)) {
      notificationJobs.push(
        (async () => {
          const waResult = await sendStatusNotification({
            reportId,
            phoneNumber: report.nomorWa,
            message: buildDisposisiMessage(
              report.nama,
              report.nomorLaporan,
              bidangNamaUntukPelapor,
              catatan
            ),
          });

          await createReportAuditLog({
            reportId,
            action: waResult.success ? "wa_disposisi_sent" : "wa_disposisi_failed",
            actorType: "system",
            summary: waResult.success
              ? "Notifikasi WhatsApp disposisi terkirim ke pelapor"
              : "Notifikasi WhatsApp disposisi gagal dikirim ke pelapor",
            metadata: {
              recipient: "pelapor",
              phoneNumber: report.nomorWa,
              bidangNama: bidangNamaUntukPelapor,
              error: waResult.error ?? null,
            },
          });
        })()
      );
    }

    if (targetBidang?.nama && targetBidangAdmin?.phoneNumber) {
      const targetBidangPhoneNumber = targetBidangAdmin.phoneNumber;

      notificationJobs.push(
        (async () => {
          const waResult = await sendBidangNotification(
            targetBidangPhoneNumber,
            buildBidangDisposisiNotification({
              bidangNama: targetBidang.nama,
              nomorLaporan: report.nomorLaporan,
              namaWarga: report.nama,
              isiLaporan: report.isiLaporan ?? "",
              catatan,
            })
          );

          await createReportAuditLog({
            reportId,
            action: waResult.success
              ? "wa_bidang_disposisi_sent"
              : "wa_bidang_disposisi_failed",
            actorType: "system",
            summary: waResult.success
              ? "Notifikasi WhatsApp disposisi terkirim ke admin seksi tujuan"
              : "Notifikasi WhatsApp disposisi gagal dikirim ke admin seksi tujuan",
            metadata: {
              recipient: "bidang_admin",
              bidangNama: targetBidang.nama,
              phoneNumber: targetBidangPhoneNumber,
              error: waResult.error ?? null,
            },
          });
        })()
      );
    }

    await Promise.all(notificationJobs);
  }

  return NextResponse.json({ success: true });
}
