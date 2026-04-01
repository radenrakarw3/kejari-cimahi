import { db } from "@/lib/db";
import { reports, categories, disposisi, waLogs, bidang } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LaporanDetailClient } from "./laporan-detail-client";

export const dynamic = "force-dynamic";

export default async function LaporanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reportId = parseInt(id);
  if (isNaN(reportId)) notFound();

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

  if (!report) notFound();

  const [disposisiList, waLogsList, allBidang, allCategories] = await Promise.all([
    db
      .select({
        id: disposisi.id,
        catatan: disposisi.catatan,
        disposedAt: disposisi.disposedAt,
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
    db.select().from(bidang),
    db.select().from(categories),
  ]);

  return (
    <LaporanDetailClient
      report={report}
      disposisiList={disposisiList}
      waLogsList={waLogsList}
      allBidang={allBidang}
      allCategories={allCategories}
    />
  );
}
