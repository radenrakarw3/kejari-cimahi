import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports, categories, disposisi, waLogs, bidang, user } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { broadcastSseEvent } from "@/lib/sse";
import { getAuthenticatedUser } from "@/lib/authz";
import {
  buildBidangDisposisiNotification,
  buildDisposisiMessage,
  buildProsesMessage,
  buildSelesaiMessage,
  normalizePhone,
  sendWhatsApp,
} from "@/lib/whatsapp";

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
}

async function sendBidangNotification(phoneNumber: string, message: string) {
  const result = await sendWhatsApp(phoneNumber, message);
  if (!result.success) {
    console.error("Failed to send bidang notification:", result.error);
  }
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
    if (body.kategoriId !== undefined || body.disposisi) {
      return NextResponse.json({ error: "Aksi ini hanya untuk admin" }, { status: 403 });
    }

    if (!body.status || !["diproses", "selesai"].includes(body.status)) {
      return NextResponse.json({ error: "Status tidak diizinkan untuk bidang" }, { status: 403 });
    }

    if (!latestDisposisi || latestDisposisi.bidangId !== currentUser.bidangId) {
      return NextResponse.json({ error: "Laporan ini bukan disposisi bidang Anda" }, { status: 403 });
    }
  }

  // Update status
  if (body.status) {
    await db
      .update(reports)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(reports.id, reportId));
    broadcastSseEvent({ type: "report_updated", reportId, status: body.status });

    if (body.status === "diproses" && latestDisposisi?.bidangNama) {
      await sendStatusNotification({
        reportId,
        phoneNumber: report.nomorWa,
        message: buildProsesMessage(report.nama, report.nomorLaporan, latestDisposisi.bidangNama),
      });
    }

    if (body.status === "selesai") {
      await sendStatusNotification({
        reportId,
        phoneNumber: report.nomorWa,
        message: buildSelesaiMessage(report.nama, report.nomorLaporan, latestDisposisi?.bidangNama),
      });
    }
  }

  // Update kategori
  if (body.kategoriId !== undefined) {
    await db
      .update(reports)
      .set({ kategoriId: body.kategoriId, updatedAt: new Date() })
      .where(eq(reports.id, reportId));
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

    if (targetBidang?.nama) {
      await sendStatusNotification({
        reportId,
        phoneNumber: report.nomorWa,
        message: buildDisposisiMessage(report.nama, report.nomorLaporan, targetBidang.nama, catatan),
      });

      if (targetBidangAdmin?.phoneNumber) {
        await sendBidangNotification(
          targetBidangAdmin.phoneNumber,
          buildBidangDisposisiNotification({
            bidangNama: targetBidang.nama,
            nomorLaporan: report.nomorLaporan,
            namaWarga: report.nama,
            isiLaporan: report.isiLaporan ?? "",
            catatan,
          })
        );
      }
    }
  }

  return NextResponse.json({ success: true });
}
