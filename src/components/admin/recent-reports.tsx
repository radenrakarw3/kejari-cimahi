import Link from "next/link";
import { db } from "@/lib/db";
import { reports, categories } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { ExternalLink, Globe, MessageSquare, Laptop, MapPin } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  masuk:     { label: "Masuk",     color: "#f5c518", bg: "rgba(245,197,24,0.15)" },
  diproses:  { label: "Diproses",  color: "#f0b429", bg: "rgba(240,180,41,0.15)" },
  disposisi: { label: "Disposisi", color: "#86efac", bg: "rgba(134,239,172,0.12)" },
  selesai:   { label: "Selesai",   color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
};

export async function RecentReports() {
  const data = await db
    .select({
      id: reports.id,
      nomorLaporan: reports.nomorLaporan,
      nama: reports.nama,
      kelurahan: reports.kelurahan,
      status: reports.status,
      source: reports.source,
      createdAt: reports.createdAt,
      kategoriNama: categories.nama,
      kategoriWarna: categories.warna,
    })
    .from(reports)
    .leftJoin(categories, eq(reports.kategoriId, categories.id))
    .orderBy(desc(reports.createdAt))
    .limit(10);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(240,180,41,0.12)" }}>
        <h3 className="font-semibold text-sm" style={{ color: "#f5c518" }}>Laporan Terbaru</h3>
        <Link
          href="/admin/laporan"
          className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{ color: "#f0b429" }}
        >
          Lihat Semua <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="py-16 text-center text-sm" style={{ color: "#a8d5b5" }}>Belum ada laporan</div>
      ) : (
        <div className="divide-y" style={{ borderColor: "rgba(240,180,41,0.07)" }}>
          {data.map((report) => {
            const st = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.masuk;
            const SourceIcon = report.source === "wa" ? MessageSquare : report.source === "offline" ? Laptop : Globe;
            const sourceColor = report.source === "wa" ? "#4ade80" : report.source === "offline" ? "#a8d5b5" : "#f0b429";
            return (
              <Link
                key={report.id}
                href={`/admin/laporan/${report.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[rgba(240,180,41,0.05)]"
              >
                <div className="flex-shrink-0">
                  <SourceIcon className="w-4 h-4" style={{ color: sourceColor }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate" style={{ color: "#c8e6d0" }}>{report.nama}</span>
                    <span className="text-xs font-mono hidden sm:inline" style={{ color: "rgba(168,213,181,0.5)" }}>
                      {report.nomorLaporan}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: "#a8d5b5" }}>
                    <MapPin className="w-3 h-3" />
                    {report.kelurahan}
                  </div>
                </div>

                {report.kategoriNama && (
                  <div className="hidden md:flex items-center gap-1.5 text-xs" style={{ color: "#a8d5b5" }}>
                    <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: report.kategoriWarna ?? "#f0b429" }} />
                    <span className="max-w-[100px] truncate">{report.kategoriNama}</span>
                  </div>
                )}

                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ color: st.color, backgroundColor: st.bg }}
                >
                  {st.label}
                </span>

                <div className="text-xs flex-shrink-0 hidden sm:block" style={{ color: "rgba(168,213,181,0.5)" }}>
                  {report.createdAt ? format(new Date(report.createdAt), "dd MMM", { locale: id }) : "-"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
