import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bidang, ptspVisitLogs, reports } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function PtspDashboardPage() {
  const [stats, visits] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`,
        reportVisits: sql<number>`count(*) filter (where ${ptspVisitLogs.serviceType} = 'report')`,
        followUpVisits: sql<number>`count(*) filter (where ${ptspVisitLogs.serviceType} = 'follow_up')`,
        guestbookVisits: sql<number>`count(*) filter (where ${ptspVisitLogs.serviceType} = 'guestbook')`,
      })
      .from(ptspVisitLogs),
    db
      .select({
        id: ptspVisitLogs.id,
        visitorCardNumber: ptspVisitLogs.visitorCardNumber,
        visitorName: ptspVisitLogs.visitorName,
        visitorPhone: ptspVisitLogs.visitorPhone,
        serviceType: ptspVisitLogs.serviceType,
        reportNumber: ptspVisitLogs.reportNumber,
        targetName: ptspVisitLogs.targetName,
        isIncognito: ptspVisitLogs.isIncognito,
        createdAt: ptspVisitLogs.createdAt,
        bidangNama: bidang.nama,
        reportId: reports.id,
      })
      .from(ptspVisitLogs)
      .leftJoin(bidang, eq(ptspVisitLogs.bidangId, bidang.id))
      .leftJoin(reports, eq(ptspVisitLogs.reportId, reports.id))
      .orderBy(desc(ptspVisitLogs.createdAt))
      .limit(50),
  ]);

  const summary = stats[0] ?? { total: 0, reportVisits: 0, followUpVisits: 0, guestbookVisits: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f5c518" }}>Dashboard Kunjungan PTSP</h1>
        <p className="text-sm mt-1" style={{ color: "#a8d5b5" }}>
          Pantau seluruh kunjungan front desk, kartu visitor, dan tujuan layanan secara terpusat.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Kunjungan", value: summary.total, color: "#f0b429" },
          { label: "Buat Laporan", value: summary.reportVisits, color: "#86efac" },
          { label: "Tindak Lanjut", value: summary.followUpVisits, color: "#60a5fa" },
          { label: "Buku Tamu", value: summary.guestbookVisits, color: "#f5c518" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl p-5"
            style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
          >
            <div className="text-xs uppercase tracking-[0.2em]" style={{ color: item.color }}>{item.label}</div>
            <div className="mt-2 text-3xl font-bold" style={{ color: "#f5c518" }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(240,180,41,0.12)" }}>
          <div className="font-semibold text-sm" style={{ color: "#f5c518" }}>Riwayat Kunjungan Terbaru</div>
        </div>
        <div className="p-4 space-y-3">
          {visits.map((visit) => (
            <div
              key={visit.id}
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.12)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-mono" style={{ color: "#f0b429" }}>
                    {visit.visitorCardNumber ?? "-"}
                  </div>
                  <div className="mt-1 text-sm font-semibold" style={{ color: "#c8e6d0" }}>
                    {visit.visitorName}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs" style={{ color: "#a8d5b5" }}>
                    <span>{visit.serviceType}</span>
                    {visit.bidangNama && <span>{visit.bidangNama}</span>}
                    {visit.targetName && <span>{visit.targetName}</span>}
                    {visit.reportNumber && <span>{visit.reportNumber}</span>}
                    {visit.visitorPhone && <span>{visit.visitorPhone}</span>}
                    {visit.isIncognito && <span>Incognito</span>}
                  </div>
                </div>
                <div className="text-xs" style={{ color: "rgba(168,213,181,0.72)" }}>
                  {visit.createdAt ? new Date(visit.createdAt).toLocaleString("id-ID") : "-"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
