import { FileText, TrendingUp, CheckCircle, CalendarRange, CircleDashed, MapPinned, Layers3 } from "lucide-react";
import { StatsChartsClient } from "./stats-charts-client";
import { db } from "@/lib/db";
import { reports, categories } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

const JAKARTA_TZ = "Asia/Jakarta";

function formatJakarta(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TZ,
    ...options,
  }).format(date);
}

function getJakartaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function getJakartaMonthKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";

  return `${year}-${month}`;
}

function getPastJakartaDates(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (days - 1 - index));
    return date;
  });
}

function getPastJakartaMonths(months: number) {
  return Array.from({ length: months }, (_, index) => {
    const date = new Date();
    date.setUTCMonth(date.getUTCMonth() - (months - 1 - index));
    return date;
  });
}

export async function DashboardStats() {
  const now = new Date();
  const todayKey = getJakartaDateKey(now);
  const currentMonthKey = getJakartaMonthKey(now);
  const dateWindow = getPastJakartaDates(30);
  const monthWindow = getPastJakartaMonths(6);
  const monthlyWindowKeys = new Set(monthWindow.map(getJakartaMonthKey));
  const dateWindowKeys = new Set(dateWindow.map(getJakartaDateKey));

  const data = await db
    .select({
      id: reports.id,
      status: reports.status,
      source: reports.source,
      kelurahan: reports.kelurahan,
      createdAt: reports.createdAt,
      kategoriId: reports.kategoriId,
      kategoriNama: categories.nama,
      kategoriWarna: categories.warna,
    })
    .from(reports)
    .leftJoin(categories, eq(reports.kategoriId, categories.id))
    .orderBy(desc(reports.createdAt));

  const total = data.length;
  const openStatuses = new Set(["masuk", "diproses", "disposisi"]);
  const statusCount = new Map<string, number>();
  const categoryCount = new Map<string, { name: string; color: string; total: number }>();
  const categoryCountMonth = new Map<string, number>();
  const kelurahanCount = new Map<string, number>();
  const sourceCount = new Map<string, number>();
  const sourceCountMonth = new Map<string, number>();
  const trendCount = new Map<string, { total: number; web: number; wa: number; offline: number; selesai: number }>();
  const monthlyCount = new Map<string, { total: number; web: number; wa: number; offline: number; selesai: number }>();

  let today = 0;
  let pending = 0;
  let completedMonth = 0;
  let totalMonth = 0;

  for (const row of data) {
    if (!row.createdAt) continue;

    const createdAt = new Date(row.createdAt);
    const dateKey = getJakartaDateKey(createdAt);
    const monthKey = getJakartaMonthKey(createdAt);
    const status = row.status ?? "masuk";
    const source = row.source ?? "web";
    const categoryKey = String(row.kategoriId ?? "unknown");
    const categoryName = row.kategoriNama ?? "Belum Dikategorikan";
    const categoryColor = row.kategoriWarna ?? "#6b7280";
    const kelurahan = row.kelurahan ?? "Tidak diketahui";

    statusCount.set(status, (statusCount.get(status) ?? 0) + 1);
    kelurahanCount.set(kelurahan, (kelurahanCount.get(kelurahan) ?? 0) + 1);
    sourceCount.set(source, (sourceCount.get(source) ?? 0) + 1);

    const currentCategory = categoryCount.get(categoryKey) ?? {
      name: categoryName,
      color: categoryColor,
      total: 0,
    };
    currentCategory.total += 1;
    categoryCount.set(categoryKey, currentCategory);

    if (dateKey === todayKey) today += 1;
    if (openStatuses.has(status)) pending += 1;

    if (monthKey === currentMonthKey) {
      totalMonth += 1;
      sourceCountMonth.set(source, (sourceCountMonth.get(source) ?? 0) + 1);
      categoryCountMonth.set(categoryName, (categoryCountMonth.get(categoryName) ?? 0) + 1);
      if (status === "selesai") completedMonth += 1;
    }

    if (dateWindowKeys.has(dateKey)) {
      const currentTrend = trendCount.get(dateKey) ?? { total: 0, web: 0, wa: 0, offline: 0, selesai: 0 };
      currentTrend.total += 1;
      if (source === "web") currentTrend.web += 1;
      if (source === "wa") currentTrend.wa += 1;
      if (source === "offline") currentTrend.offline += 1;
      if (status === "selesai") currentTrend.selesai += 1;
      trendCount.set(dateKey, currentTrend);
    }

    if (monthlyWindowKeys.has(monthKey)) {
      const currentMonth = monthlyCount.get(monthKey) ?? { total: 0, web: 0, wa: 0, offline: 0, selesai: 0 };
      currentMonth.total += 1;
      if (source === "web") currentMonth.web += 1;
      if (source === "wa") currentMonth.wa += 1;
      if (source === "offline") currentMonth.offline += 1;
      if (status === "selesai") currentMonth.selesai += 1;
      monthlyCount.set(monthKey, currentMonth);
    }
  }

  const byCategory = Array.from(categoryCount.entries())
    .map(([key, value]) => ({
      kategoriId: key === "unknown" ? null : Number(key),
      kategoriNama: value.name,
      kategoriWarna: value.color,
      total: value.total,
    }))
    .sort((a, b) => b.total - a.total);

  const byKelurahan = Array.from(kelurahanCount.entries())
    .map(([kelurahan, totalCount]) => ({ kelurahan, total: totalCount }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const bySource = Array.from(sourceCount.entries()).map(([source, totalCount]) => ({ source, total: totalCount }));
  const byStatus = Array.from(statusCount.entries()).map(([status, totalCount]) => ({ status, total: totalCount }));

  const trend = dateWindow.map((date) => {
    const key = getJakartaDateKey(date);
    const current = trendCount.get(key) ?? { total: 0, web: 0, wa: 0, offline: 0, selesai: 0 };
    return {
      key,
      label: formatJakarta(date, { day: "2-digit", month: "short" }),
      ...current,
    };
  });

  const monthly = monthWindow.map((date) => {
    const key = getJakartaMonthKey(date);
    const current = monthlyCount.get(key) ?? { total: 0, web: 0, wa: 0, offline: 0, selesai: 0 };
    return {
      key,
      label: formatJakarta(date, { month: "short", year: "2-digit" }),
      ...current,
    };
  });

  const avgDailyMonth = totalMonth > 0 ? Math.round((totalMonth / new Date().getDate()) * 10) / 10 : 0;
  const completionRate = totalMonth > 0 ? Math.round((completedMonth / totalMonth) * 100) : 0;
  const topCategoryMonth = Array.from(categoryCountMonth.entries()).sort((a, b) => b[1] - a[1])[0];
  const dominantSourceMonth = Array.from(sourceCountMonth.entries()).sort((a, b) => b[1] - a[1])[0];
  const topKelurahan = byKelurahan[0];
  const nowLabel = formatJakarta(now, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const monthLabel = formatJakarta(now, { month: "long", year: "numeric" });

  const cards = [
    {
      label: "Total Laporan",
      value: total,
      sublabel: "Akumulasi seluruh kanal",
      icon: FileText,
      accent: "#f0b429",
    },
    {
      label: "Masuk Hari Ini",
      value: today,
      sublabel: `Tanggal Jakarta ${formatJakarta(now, { day: "2-digit", month: "long" })}`,
      icon: TrendingUp,
      accent: "#86efac",
    },
    {
      label: "Perlu Tindak Lanjut",
      value: pending,
      sublabel: "Status masuk, diproses, disposisi",
      icon: CircleDashed,
      accent: "#f97316",
    },
    {
      label: "Selesai Bulan Ini",
      value: completedMonth,
      sublabel: `${completionRate}% dari laporan ${monthLabel}`,
      icon: CheckCircle,
      accent: "#4ade80",
    },
  ];

  return (
    <div className="space-y-6">
      <div
        className="rounded-[28px] p-6"
        style={{
          background: "linear-gradient(135deg, rgba(240,180,41,0.10), rgba(13,77,34,0.96) 30%, rgba(10,61,26,0.98) 100%)",
          border: "1px solid rgba(240,180,41,0.18)",
        }}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.24em] font-semibold mb-2" style={{ color: "#f0b429" }}>
              Dashboard Operasional
            </div>
            <h2 className="text-2xl font-bold" style={{ color: "#f5c518" }}>
              Monitoring laporan dengan waktu Jakarta yang konsisten
            </h2>
            <p className="text-sm mt-2 leading-6" style={{ color: "#c8e6d0" }}>
              Semua ringkasan harian dan bulanan pada dashboard ini mengikuti zona waktu Indonesia Barat, yaitu GMT+7 Asia/Jakarta, agar tracking operasional tidak bergeser saat tutup buku bulanan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:min-w-[420px]">
            {[
              {
                label: "Waktu Server Dashboard",
                value: nowLabel,
                icon: CalendarRange,
              },
              {
                label: "Rata-rata Harian Bulan Ini",
                value: `${avgDailyMonth.toLocaleString("id-ID")} laporan/hari`,
                icon: Layers3,
              },
              {
                label: "Kategori Terbanyak Bulan Ini",
                value: topCategoryMonth ? topCategoryMonth[0] : "Belum ada data",
                icon: FileText,
              },
              {
                label: "Kelurahan Tertinggi",
                value: topKelurahan ? topKelurahan.kelurahan : "Belum ada data",
                icon: MapPinned,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl px-4 py-3"
                style={{ backgroundColor: "rgba(7,31,13,0.34)", border: "1px solid rgba(240,180,41,0.12)" }}
              >
                <div className="flex items-center gap-2 text-xs mb-2" style={{ color: "#a8d5b5" }}>
                  <item.icon className="w-3.5 h-3.5" style={{ color: "#f0b429" }} />
                  {item.label}
                </div>
                <div className="text-sm font-semibold leading-6" style={{ color: "#f5c518" }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
            <div className="text-xs font-semibold" style={{ color: "#a8d5b5" }}>{card.label}</div>
            <div className="text-[11px] mt-1 leading-5" style={{ color: "rgba(168,213,181,0.68)" }}>
              {card.sublabel}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Dominan Kanal Bulan Ini",
            value: dominantSourceMonth ? dominantSourceMonth[0].toUpperCase() : "BELUM ADA",
            desc: dominantSourceMonth ? `${dominantSourceMonth[1]} laporan masuk` : "Belum ada laporan bulan ini",
          },
          {
            label: "Total Bulan Ini",
            value: totalMonth.toLocaleString("id-ID"),
            desc: `Rekap periode ${monthLabel}`,
          },
          {
            label: "Belum Dikategorikan",
            value: (byCategory.find((item) => item.kategoriId === null)?.total ?? 0).toLocaleString("id-ID"),
            desc: "Perlu ditetapkan admin dari detail laporan",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl px-5 py-4"
            style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" }}
          >
            <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "#a8d5b5" }}>
              {item.label}
            </div>
            <div className="text-2xl font-bold mt-2" style={{ color: "#f5c518" }}>
              {item.value}
            </div>
            <div className="text-xs mt-1.5 leading-5" style={{ color: "rgba(168,213,181,0.68)" }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>

      <StatsChartsClient
        byCategory={byCategory}
        byKelurahan={byKelurahan}
        trend={trend}
        monthly={monthly}
        bySource={bySource}
        byStatus={byStatus}
      />
    </div>
  );
}
