import Link from "next/link";
import { desc, eq, ilike, or } from "drizzle-orm";
import { Search, FileSearch, MonitorSmartphone } from "lucide-react";
import { db } from "@/lib/db";
import { bidang, categories, ptspVisitLogs, reports } from "@/lib/schema";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function GlobalSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const [reportResults, visitResults] = q
    ? await Promise.all([
        db
          .select({
            id: reports.id,
            nomorLaporan: reports.nomorLaporan,
            nama: reports.nama,
            nomorWa: reports.nomorWa,
            status: reports.status,
            kelurahan: reports.kelurahan,
            rw: reports.rw,
            kategoriNama: categories.nama,
          })
          .from(reports)
          .leftJoin(categories, eq(reports.kategoriId, categories.id))
          .where(
            or(
              ilike(reports.nomorLaporan, `%${q}%`),
              ilike(reports.nama, `%${q}%`),
              ilike(reports.nomorWa, `%${q}%`)
            )
          )
          .orderBy(desc(reports.createdAt))
          .limit(12),
        db
          .select({
            id: ptspVisitLogs.id,
            visitorCardNumber: ptspVisitLogs.visitorCardNumber,
            visitorName: ptspVisitLogs.visitorName,
            visitorPhone: ptspVisitLogs.visitorPhone,
            serviceType: ptspVisitLogs.serviceType,
            targetName: ptspVisitLogs.targetName,
            reportNumber: ptspVisitLogs.reportNumber,
            createdAt: ptspVisitLogs.createdAt,
            bidangNama: bidang.nama,
          })
          .from(ptspVisitLogs)
          .leftJoin(bidang, eq(ptspVisitLogs.bidangId, bidang.id))
          .where(
            or(
              ilike(ptspVisitLogs.visitorCardNumber, `%${q}%`),
              ilike(ptspVisitLogs.visitorName, `%${q}%`),
              ilike(ptspVisitLogs.visitorPhone, `%${q}%`),
              ilike(ptspVisitLogs.reportNumber, `%${q}%`),
              ilike(ptspVisitLogs.targetName, `%${q}%`)
            )
          )
          .orderBy(desc(ptspVisitLogs.createdAt))
          .limit(12),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f5c518" }}>Pencarian Global</h1>
        <p className="text-sm mt-1" style={{ color: "#a8d5b5" }}>
          Cari lintas laporan dan kunjungan PTSP dengan nama, nomor laporan, nomor WA, atau kartu visitor.
        </p>
      </div>

      <form className="rounded-2xl p-4" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.16)" }}>
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8d5b5" }} />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Contoh: LPR-2026-0001, VC-260509-001, nama pelapor, nama tamu, atau nomor WA"
            className="h-12 rounded-xl pl-10 text-sm"
            style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0" }}
          />
        </div>
      </form>

      {!q ? (
        <div className="rounded-2xl px-5 py-12 text-center text-sm" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.16)", color: "#a8d5b5" }}>
          Masukkan kata kunci untuk mulai mencari.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.16)" }}>
            <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "rgba(240,180,41,0.12)", color: "#f5c518" }}>
              <FileSearch className="w-4 h-4" />
              <span className="font-semibold text-sm">Hasil Laporan</span>
            </div>
            <div className="p-4 space-y-3">
              {reportResults.length === 0 ? (
                <div className="rounded-xl px-4 py-6 text-sm text-center" style={{ backgroundColor: "#145228", color: "#a8d5b5" }}>
                  Tidak ada laporan yang cocok.
                </div>
              ) : (
                reportResults.map((item) => (
                  <Link
                    key={item.id}
                    href={`/admin/laporan/${item.id}`}
                    className="block rounded-xl px-4 py-3"
                    style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.12)" }}
                  >
                    <div className="text-xs font-mono" style={{ color: "#f0b429" }}>{item.nomorLaporan}</div>
                    <div className="mt-1 text-sm font-semibold" style={{ color: "#c8e6d0" }}>{item.nama}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs" style={{ color: "#a8d5b5" }}>
                      <span>{item.nomorWa || "Tanpa WA"}</span>
                      <span>{item.kelurahan} RW {item.rw}</span>
                      <span>{item.status}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.16)" }}>
            <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "rgba(240,180,41,0.12)", color: "#f5c518" }}>
              <MonitorSmartphone className="w-4 h-4" />
              <span className="font-semibold text-sm">Hasil Kunjungan PTSP</span>
            </div>
            <div className="p-4 space-y-3">
              {visitResults.length === 0 ? (
                <div className="rounded-xl px-4 py-6 text-sm text-center" style={{ backgroundColor: "#145228", color: "#a8d5b5" }}>
                  Tidak ada kunjungan PTSP yang cocok.
                </div>
              ) : (
                visitResults.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl px-4 py-3"
                    style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.12)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-mono" style={{ color: "#f0b429" }}>
                          {item.visitorCardNumber ?? "-"}
                        </div>
                        <div className="mt-1 text-sm font-semibold" style={{ color: "#c8e6d0" }}>
                          {item.visitorName}
                        </div>
                      </div>
                      <div className="text-[11px] px-2 py-1 rounded-full" style={{ color: "#f0b429", backgroundColor: "rgba(240,180,41,0.12)" }}>
                        {item.serviceType}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs" style={{ color: "#a8d5b5" }}>
                      {item.visitorPhone && <span>{item.visitorPhone}</span>}
                      {item.reportNumber && <span>{item.reportNumber}</span>}
                      {item.bidangNama && <span>{item.bidangNama}</span>}
                      {item.targetName && <span>{item.targetName}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
