import { FileText, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { StatsChartsClient } from "./stats-charts-client";
import { db } from "@/lib/db";
import { reports, categories } from "@/lib/schema";
import { eq, count, gte, and, sql } from "drizzle-orm";

export async function DashboardStats() {
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
  ] = await Promise.all([
    db.select({ total: count() }).from(reports),
    db.select({ total: count() }).from(reports).where(gte(reports.createdAt, todayStart)),
    db.select({ total: count() }).from(reports).where(sql`${reports.status} IN ('masuk', 'diproses')`),
    db.select({ total: count() }).from(reports).where(and(eq(reports.status, "selesai"), gte(reports.createdAt, monthStart))),
    db
      .select({ kategoriId: reports.kategoriId, kategoriNama: categories.nama, kategoriWarna: categories.warna, total: count() })
      .from(reports)
      .leftJoin(categories, eq(reports.kategoriId, categories.id))
      .groupBy(reports.kategoriId, categories.nama, categories.warna),
    db.select({ kelurahan: reports.kelurahan, total: count() }).from(reports).groupBy(reports.kelurahan).orderBy(sql`count(*) desc`).limit(10),
    db.select({ source: reports.source, total: count() }).from(reports).groupBy(reports.source),
    db
      .select({
        date: sql<string>`DATE(${reports.createdAt})`,
        total: count(),
        web: sql<number>`COUNT(CASE WHEN ${reports.source} = 'web' THEN 1 END)`,
        wa: sql<number>`COUNT(CASE WHEN ${reports.source} = 'wa' THEN 1 END)`,
      })
      .from(reports)
      .where(gte(reports.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${reports.createdAt})`)
      .orderBy(sql`DATE(${reports.createdAt})`),
  ]);

  const stats = {
    total: totalResult[0]?.total ?? 0,
    today: todayResult[0]?.total ?? 0,
    pending: pendingResult[0]?.total ?? 0,
    completedMonth: completedMonthResult[0]?.total ?? 0,
    byCategory: byCategoryResult,
    byKelurahan: byKelurahanResult,
    bySource: bySourceResult,
    trend: trendResult,
  };

  const cards = [
    { label: "Total Laporan",     value: stats.total,          icon: FileText,    accent: "#f0b429" },
    { label: "Laporan Hari Ini",  value: stats.today,          icon: TrendingUp,  accent: "#86efac" },
    { label: "Menunggu Proses",   value: stats.pending,        icon: Clock,       accent: "#f0b429" },
    { label: "Selesai Bulan Ini", value: stats.completedMonth, icon: CheckCircle, accent: "#4ade80" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl p-5 transition-all hover:scale-[1.02]"
            style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: card.accent + "20" }}
            >
              <card.icon className="w-5 h-5" style={{ color: card.accent }} />
            </div>
            <div className="text-3xl font-bold mb-1" style={{ color: "#f5c518" }}>
              {card.value.toLocaleString("id-ID")}
            </div>
            <div className="text-xs" style={{ color: "#a8d5b5" }}>{card.label}</div>
          </div>
        ))}
      </div>

      <StatsChartsClient
        byCategory={stats.byCategory}
        byKelurahan={stats.byKelurahan}
        trend={stats.trend}
        bySource={stats.bySource}
      />
    </div>
  );
}
