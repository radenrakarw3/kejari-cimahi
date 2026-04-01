import Link from "next/link";
import { db } from "@/lib/db";
import { reports, categories } from "@/lib/schema";
import { eq, desc, ilike, and, count, sql } from "drizzle-orm";
import { Globe, MessageSquare, MapPin, ChevronLeft, ChevronRight, Laptop } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  masuk:     { label: "Masuk",     color: "#f5c518", bg: "rgba(245,197,24,0.15)" },
  diproses:  { label: "Diproses",  color: "#f0b429", bg: "rgba(240,180,41,0.15)" },
  disposisi: { label: "Disposisi", color: "#86efac", bg: "rgba(134,239,172,0.12)" },
  selesai:   { label: "Selesai",   color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
};

const SOURCE_ICON: Record<string, React.ElementType> = { web: Globe, wa: MessageSquare, offline: Laptop };
const SOURCE_COLOR: Record<string, string> = { web: "#f0b429", wa: "#4ade80", offline: "#a8d5b5" };

interface LaporanTableProps {
  searchParams: Record<string, string | undefined>;
}

export async function LaporanTable({ searchParams }: LaporanTableProps) {
  const status = searchParams.status;
  const source = searchParams.source;
  const search = searchParams.search;
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status && status !== "all") conditions.push(eq(reports.status, status));
  if (source && source !== "all") conditions.push(eq(reports.source, source));
  if (search) conditions.push(ilike(reports.nama, `%${search}%`));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db.select({
      id: reports.id, nomorLaporan: reports.nomorLaporan, nama: reports.nama,
      kelurahan: reports.kelurahan, rw: reports.rw, status: reports.status,
      source: reports.source, createdAt: reports.createdAt,
      kategoriNama: categories.nama, kategoriWarna: categories.warna,
    })
    .from(reports)
    .leftJoin(categories, eq(reports.kategoriId, categories.id))
    .where(whereClause)
    .orderBy(desc(reports.createdAt))
    .limit(limit)
    .offset(offset),
    db.select({ total: count() }).from(reports).where(whereClause),
  ]);

  const total = Number(totalResult[0]?.total ?? 0);
  const totalPages = Math.ceil(total / limit);

  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    if (source && source !== "all") params.set("source", source);
    if (search) params.set("search", search);
    params.set("page", String(p));
    return `/admin/laporan?${params.toString()}`;
  };

  const cardStyle = { backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" };

  return (
    <div className="rounded-2xl overflow-hidden" style={cardStyle}>
      {/* Header */}
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "rgba(240,180,41,0.12)" }}>
        <span className="text-sm" style={{ color: "#a8d5b5" }}>
          {total.toLocaleString("id-ID")} laporan ditemukan
        </span>
      </div>

      {data.length === 0 ? (
        <div className="py-20 text-center text-sm" style={{ color: "#a8d5b5" }}>
          Tidak ada laporan yang sesuai filter
        </div>
      ) : (
        <>
          {/* Table header */}
          <div
            className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_110px] gap-4 px-5 py-2.5 border-b text-xs uppercase tracking-wider"
            style={{ borderColor: "rgba(240,180,41,0.08)", color: "rgba(168,213,181,0.5)" }}
          >
            <span>Pelapor</span>
            <span>Lokasi</span>
            <span>Kategori</span>
            <span>Sumber</span>
            <span>Tanggal</span>
            <span>Status</span>
          </div>

          <div>
            {data.map((report, idx) => {
              const st = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.masuk;
              const SourceIcon = SOURCE_ICON[report.source] ?? Globe;
              const srcColor = SOURCE_COLOR[report.source] ?? "#f0b429";
              return (
                <Link
                  key={report.id}
                  href={`/admin/laporan/${report.id}`}
                  className="flex md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_110px] gap-4 px-5 py-4 transition-colors items-center hover:bg-[rgba(240,180,41,0.05)]"
                  style={{
                    borderBottom: idx < data.length - 1 ? "1px solid rgba(240,180,41,0.07)" : "none",
                  }}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: "#c8e6d0" }}>{report.nama}</div>
                    <div className="text-xs font-mono mt-0.5 truncate" style={{ color: "rgba(168,213,181,0.45)" }}>
                      {report.nomorLaporan}
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-1 text-xs" style={{ color: "#a8d5b5" }}>
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{report.kelurahan} RW {report.rw}</span>
                  </div>

                  <div className="hidden md:flex items-center gap-1.5 text-xs" style={{ color: "#a8d5b5" }}>
                    {report.kategoriNama ? (
                      <>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: report.kategoriWarna ?? "#f0b429" }} />
                        <span className="truncate">{report.kategoriNama}</span>
                      </>
                    ) : (
                      <span style={{ color: "rgba(168,213,181,0.3)" }}>—</span>
                    )}
                  </div>

                  <div className="hidden md:flex items-center gap-1.5">
                    <SourceIcon className="w-3.5 h-3.5" style={{ color: srcColor }} />
                    <span className="text-xs capitalize" style={{ color: "#a8d5b5" }}>{report.source}</span>
                  </div>

                  <div className="hidden md:block text-xs" style={{ color: "rgba(168,213,181,0.5)" }}>
                    {report.createdAt ? format(new Date(report.createdAt), "dd MMM yyyy", { locale: id }) : "—"}
                  </div>

                  <div className="ml-auto md:ml-0">
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ color: st.color, backgroundColor: st.bg }}
                    >
                      {st.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
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
        </>
      )}
    </div>
  );
}
