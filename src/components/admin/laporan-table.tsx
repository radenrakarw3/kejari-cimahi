import Link from "next/link";
import { db } from "@/lib/db";
import { reports, categories } from "@/lib/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";
import {
  Globe,
  MessageSquare,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Laptop,
  UserRound,
  ShieldOff,
  CalendarClock,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { getPriorityConfig, getSlaState } from "@/lib/report-sla";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  masuk: { label: "Masuk", color: "#f5c518", bg: "rgba(245,197,24,0.15)" },
  diproses: { label: "Diproses", color: "#f0b429", bg: "rgba(240,180,41,0.15)" },
  disposisi: { label: "Disposisi", color: "#86efac", bg: "rgba(134,239,172,0.12)" },
  menunggu_data_tambahan: { label: "Menunggu Data", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  selesai: { label: "Selesai", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
};

const SOURCE_ICON: Record<string, React.ElementType> = { web: Globe, wa: MessageSquare, offline: Laptop };
const SOURCE_COLOR: Record<string, string> = { web: "#f0b429", wa: "#4ade80", offline: "#a8d5b5" };

interface LaporanTableProps {
  searchParams: Record<string, string | undefined>;
}

type ReportRow = {
  id: number;
  nomorLaporan: string;
  nama: string;
  nomorWa: string;
  kelurahan: string;
  rw: string;
  status: string;
  source: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  priorityLevel: string;
  kategoriNama: string | null;
  kategoriWarna: string | null;
};

function isAnonymousReport(report: Pick<ReportRow, "nama" | "nomorWa">) {
  return report.nama === "Anonim" || !report.nomorWa?.trim();
}

function SectionHeader({
  title,
  description,
  count,
  icon: Icon,
}: {
  title: string;
  description: string;
  count: number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(240,180,41,0.12)" }}>
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "rgba(240,180,41,0.10)", border: "1px solid rgba(240,180,41,0.16)" }}
        >
          <Icon className="w-5 h-5" style={{ color: "#f0b429" }} />
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: "#f5c518" }}>{title}</div>
          <div className="text-xs mt-1" style={{ color: "#a8d5b5" }}>{description}</div>
        </div>
      </div>
      <div
        className="rounded-full px-3 py-1 text-xs font-semibold"
        style={{ backgroundColor: "rgba(240,180,41,0.12)", color: "#f0b429" }}
      >
        {count} laporan
      </div>
    </div>
  );
}

function ReportCard({ report }: { report: ReportRow }) {
  const st = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.masuk;
  const SourceIcon = SOURCE_ICON[report.source] ?? Globe;
  const srcColor = SOURCE_COLOR[report.source] ?? "#f0b429";
  const priorityConfig = getPriorityConfig(report.priorityLevel);
  const slaState = getSlaState({
    status: report.status,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  });
  const isAnonymous = isAnonymousReport(report);

  return (
    <Link
      href={`/admin/laporan/${report.id}`}
      className="block rounded-[24px] p-4 transition-all hover:translate-y-[-1px] hover:bg-[rgba(240,180,41,0.03)]"
      style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.12)" }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold truncate" style={{ color: "#c8e6d0" }}>{report.nama}</div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: priorityConfig.color, backgroundColor: priorityConfig.bg }}>
              {priorityConfig.label}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: slaState.color, backgroundColor: slaState.bg }}>
              {slaState.label}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: st.color, backgroundColor: st.bg }}>
              {st.label}
            </span>
          </div>

          <div className="mt-1 text-xs font-mono" style={{ color: "rgba(168,213,181,0.50)" }}>
            {report.nomorLaporan}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{ backgroundColor: "rgba(7,31,13,0.32)", color: "#a8d5b5" }}>
              <MapPin className="w-3.5 h-3.5" />
              {report.kelurahan} RW {report.rw}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{ backgroundColor: "rgba(7,31,13,0.32)", color: "#a8d5b5" }}>
              <SourceIcon className="w-3.5 h-3.5" style={{ color: srcColor }} />
              {report.source}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{ backgroundColor: "rgba(7,31,13,0.32)", color: isAnonymous ? "#f5c518" : "#86efac" }}>
              {isAnonymous ? <ShieldOff className="w-3.5 h-3.5" /> : <UserRound className="w-3.5 h-3.5" />}
              {isAnonymous ? "Anonim" : "Dengan identitas"}
            </span>
            {report.kategoriNama && (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{ backgroundColor: "rgba(7,31,13,0.32)", color: "#a8d5b5" }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: report.kategoriWarna ?? "#f0b429" }} />
                {report.kategoriNama}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:min-w-[170px]">
          <div className="rounded-2xl px-3 py-2" style={{ backgroundColor: "rgba(7,31,13,0.30)", border: "1px solid rgba(240,180,41,0.08)" }}>
            <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "rgba(168,213,181,0.55)" }}>Masuk</div>
            <div className="mt-1 text-xs font-semibold" style={{ color: "#c8e6d0" }}>
              {report.createdAt ? format(new Date(report.createdAt), "dd MMM yyyy, HH:mm", { locale: id }) : "—"}
            </div>
          </div>
          <div className="rounded-2xl px-3 py-2" style={{ backgroundColor: "rgba(7,31,13,0.30)", border: "1px solid rgba(240,180,41,0.08)" }}>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em]" style={{ color: "rgba(168,213,181,0.55)" }}>
              <CalendarClock className="w-3.5 h-3.5" />
              SLA
            </div>
            <div className="mt-1 text-xs font-semibold" style={{ color: slaState.color }}>
              {slaState.label}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export async function LaporanTable({ searchParams }: LaporanTableProps) {
  const status = searchParams.status;
  const source = searchParams.source;
  const priority = searchParams.priority;
  const search = searchParams.search;
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status && status !== "all") conditions.push(eq(reports.status, status));
  if (source && source !== "all") conditions.push(eq(reports.source, source));
  if (priority && priority !== "all") conditions.push(eq(reports.priorityLevel, priority));
  if (search) {
    conditions.push(
      sql`(
        ${reports.nama} ilike ${`%${search}%`}
        or ${reports.nomorLaporan} ilike ${`%${search}%`}
        or ${reports.nomorWa} ilike ${`%${search}%`}
      )`
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const anonymousSort = sql<number>`case when ${reports.nama} = 'Anonim' or ${reports.nomorWa} = '' then 1 else 0 end`;

  const [data, totalResult] = await Promise.all([
    db
      .select({
        id: reports.id,
        nomorLaporan: reports.nomorLaporan,
        nama: reports.nama,
        nomorWa: reports.nomorWa,
        kelurahan: reports.kelurahan,
        rw: reports.rw,
        status: reports.status,
        source: reports.source,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
        priorityLevel: reports.priorityLevel,
        kategoriNama: categories.nama,
        kategoriWarna: categories.warna,
      })
      .from(reports)
      .leftJoin(categories, eq(reports.kategoriId, categories.id))
      .where(whereClause)
      .orderBy(anonymousSort, desc(reports.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(reports).where(whereClause),
  ]);

  const total = Number(totalResult[0]?.total ?? 0);
  const totalPages = Math.ceil(total / limit);

  const identifiedReports = data.filter((report) => !isAnonymousReport(report));
  const anonymousReports = data.filter((report) => isAnonymousReport(report));

  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    if (source && source !== "all") params.set("source", source);
    if (priority && priority !== "all") params.set("priority", priority);
    if (search) params.set("search", search);
    params.set("page", String(p));
    return `/admin/laporan?${params.toString()}`;
  };

  const cardStyle = { backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" };

  return (
    <div className="space-y-4">
      <div
        className="rounded-[20px] px-3 py-3"
        style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.14)" }}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            {
              label: "Total Tersaring",
              value: total.toLocaleString("id-ID"),
              description: "Seluruh laporan sesuai filter aktif",
              accent: "#f0b429",
              bg: "rgba(240,180,41,0.08)",
            },
            {
              label: "Prioritas Utama",
              value: identifiedReports.length.toLocaleString("id-ID"),
              description: "Dengan identitas, tampil lebih dulu",
              accent: "#86efac",
              bg: "rgba(134,239,172,0.08)",
            },
            {
              label: "Laporan Anonim",
              value: anonymousReports.length.toLocaleString("id-ID"),
              description: "Tetap tercatat, ditempatkan setelahnya",
              accent: "#f5c518",
              bg: "rgba(245,197,24,0.08)",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl px-3 py-3"
              style={{
                backgroundColor: item.bg,
                border: "1px solid rgba(240,180,41,0.10)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: item.accent }}>
                    {item.label}
                  </div>
                  <div className="mt-1 text-xs leading-5" style={{ color: "#a8d5b5" }}>
                    {item.description}
                  </div>
                </div>
                <div className="shrink-0 text-2xl font-bold leading-none" style={{ color: "#f5c518" }}>
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] overflow-hidden" style={cardStyle}>
        {data.length === 0 ? (
          <div className="py-20 text-center text-sm" style={{ color: "#a8d5b5" }}>
            Tidak ada laporan yang sesuai filter
          </div>
        ) : (
          <div className="space-y-6 p-4 sm:p-5">
            <div className="rounded-[24px] overflow-hidden" style={{ backgroundColor: "rgba(7,31,13,0.28)", border: "1px solid rgba(134,239,172,0.12)" }}>
              <SectionHeader
                title="Laporan dengan Identitas"
                description="Ditampilkan lebih dulu agar penanganan awal memprioritaskan laporan dengan identitas pelapor yang jelas."
                count={identifiedReports.length}
                icon={UserRound}
              />
              <div className="space-y-3 p-4">
                {identifiedReports.length === 0 ? (
                  <div className="rounded-2xl px-4 py-8 text-sm text-center" style={{ backgroundColor: "#145228", color: "#a8d5b5" }}>
                    Tidak ada laporan dengan identitas pada halaman ini.
                  </div>
                ) : (
                  identifiedReports.map((report) => <ReportCard key={report.id} report={report} />)
                )}
              </div>
            </div>

            <div className="rounded-[24px] overflow-hidden" style={{ backgroundColor: "rgba(7,31,13,0.28)", border: "1px solid rgba(240,180,41,0.12)" }}>
              <SectionHeader
                title="Laporan Anonim"
                description="Laporan anonim tetap ditampilkan dan diproses, namun ditempatkan setelah laporan dengan identitas."
                count={anonymousReports.length}
                icon={ShieldOff}
              />
              <div className="space-y-3 p-4">
                {anonymousReports.length === 0 ? (
                  <div className="rounded-2xl px-4 py-8 text-sm text-center" style={{ backgroundColor: "#145228", color: "#a8d5b5" }}>
                    Tidak ada laporan anonim pada halaman ini.
                  </div>
                ) : (
                  anonymousReports.map((report) => <ReportCard key={report.id} report={report} />)
                )}
              </div>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div
            className="px-5 py-4 border-t flex items-center justify-between"
            style={{ borderColor: "rgba(240,180,41,0.12)" }}
          >
            <span className="text-xs" style={{ color: "rgba(168,213,181,0.5)" }}>
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={buildPageUrl(page - 1)}
                  className="flex items-center gap-1 text-xs rounded-lg px-3 py-1.5 transition-colors"
                  style={{ color: "#a8d5b5", backgroundColor: "rgba(240,180,41,0.08)", border: "1px solid rgba(240,180,41,0.2)" }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Sebelumnya
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildPageUrl(page + 1)}
                  className="flex items-center gap-1 text-xs rounded-lg px-3 py-1.5 transition-colors"
                  style={{ color: "#f0b429", backgroundColor: "rgba(240,180,41,0.12)", border: "1px solid rgba(240,180,41,0.25)" }}
                >
                  Berikutnya
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
