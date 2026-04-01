import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports, categories } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, count, gte, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalResult,
    todayResult,
    pendingResult,
    completedMonthResult,
    byCategoryResult,
    byKelurahanResult,
    bySourceResult,
    trendResult,
    byStatusResult,
  ] = await Promise.all([
    // Total laporan
    db.select({ total: count() }).from(reports),

    // Hari ini
    db
      .select({ total: count() })
      .from(reports)
      .where(gte(reports.createdAt, todayStart)),

    // Menunggu disposisi (masuk + diproses)
    db
      .select({ total: count() })
      .from(reports)
      .where(sql`${reports.status} IN ('masuk', 'diproses')`),

    // Selesai bulan ini
    db
      .select({ total: count() })
      .from(reports)
      .where(
        and(
          eq(reports.status, "selesai"),
          gte(reports.createdAt, monthStart)
        )
      ),

    // Per kategori
    db
      .select({
        kategoriId: reports.kategoriId,
        kategoriNama: categories.nama,
        kategoriWarna: categories.warna,
        total: count(),
      })
      .from(reports)
      .leftJoin(categories, eq(reports.kategoriId, categories.id))
      .groupBy(reports.kategoriId, categories.nama, categories.warna),

    // Per kelurahan (top 10)
    db
      .select({
        kelurahan: reports.kelurahan,
        total: count(),
      })
      .from(reports)
      .groupBy(reports.kelurahan)
      .orderBy(sql`count(*) desc`)
      .limit(10),

    // Per source
    db
      .select({
        source: reports.source,
        total: count(),
      })
      .from(reports)
      .groupBy(reports.source),

    // Trend 30 hari (per hari)
    db
      .select({
        date: sql<string>`DATE(${reports.createdAt})`,
        total: count(),
        web: sql<number>`COUNT(CASE WHEN ${reports.source} = 'web' THEN 1 END)`,
        wa: sql<number>`COUNT(CASE WHEN ${reports.source} = 'wa' THEN 1 END)`,
        offline: sql<number>`COUNT(CASE WHEN ${reports.source} = 'offline' THEN 1 END)`,
      })
      .from(reports)
      .where(gte(reports.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${reports.createdAt})`)
      .orderBy(sql`DATE(${reports.createdAt})`),

    // Per status
    db
      .select({
        status: reports.status,
        total: count(),
      })
      .from(reports)
      .groupBy(reports.status),
  ]);

  return NextResponse.json({
    total: totalResult[0]?.total ?? 0,
    today: todayResult[0]?.total ?? 0,
    pending: pendingResult[0]?.total ?? 0,
    completedMonth: completedMonthResult[0]?.total ?? 0,
    byCategory: byCategoryResult,
    byKelurahan: byKelurahanResult,
    bySource: bySourceResult,
    trend: trendResult,
    byStatus: byStatusResult,
  });
}
