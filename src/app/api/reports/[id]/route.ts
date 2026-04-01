import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports, categories, disposisi, waLogs, bidang } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { broadcastSseEvent } from "@/lib/sse";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
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
      aiCategorySuggestion: reports.aiCategorySuggestion,
      aiConfidenceScore: reports.aiConfidenceScore,
      aiAlasan: reports.aiAlasan,
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
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const reportId = parseInt(id);
  const body = await req.json();

  // Update status
  if (body.status) {
    await db
      .update(reports)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(reports.id, reportId));
    broadcastSseEvent({ type: "report_updated", reportId, status: body.status });
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
    await db.insert(disposisi).values({
      reportId,
      bidangId,
      catatan,
      disposedBy: session.user.id,
    });
    await db
      .update(reports)
      .set({ status: "disposisi", updatedAt: new Date() })
      .where(eq(reports.id, reportId));
    broadcastSseEvent({ type: "report_updated", reportId, status: "disposisi" });
  }

  return NextResponse.json({ success: true });
}
