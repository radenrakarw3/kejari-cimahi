import { desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ptspVisitLogs, reports } from "@/lib/schema";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuksesClient } from "../../../lapor/sukses/[id]/sukses-client";
import { hasPtspAccess } from "@/lib/ptsp-auth";

export default async function PtspSuksesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ card?: string }>;
}) {
  if (!(await hasPtspAccess())) {
    redirect("/ptsp");
  }

  const { id } = await params;
  const { card } = await searchParams;
  const reportId = parseInt(id);

  if (isNaN(reportId)) notFound();

  const [report] = await db
    .select({
      id: reports.id,
      nomorLaporan: reports.nomorLaporan,
      nama: reports.nama,
      nomorWa: reports.nomorWa,
      kelurahan: reports.kelurahan,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(eq(reports.id, reportId));

  const [visitLog] = await db
    .select({
      visitorCardNumber: ptspVisitLogs.visitorCardNumber,
    })
    .from(ptspVisitLogs)
    .where(eq(ptspVisitLogs.reportId, reportId))
    .orderBy(desc(ptspVisitLogs.createdAt))
    .limit(1);

  if (!report) notFound();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ backgroundColor: "#071f0d" }}>
      <div className="fixed top-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />

      <div className="w-full max-w-md">
        <SuksesClient report={report} />

        <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.16)" }}>
          <div className="text-xs uppercase tracking-[0.22em] font-semibold" style={{ color: "#f0b429" }}>
            Nomor Kartu Visitor
          </div>
          <div className="mt-2 text-xl font-mono font-bold" style={{ color: "#f5c518" }}>
            {visitLog?.visitorCardNumber ?? card ?? "-"}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link href="/ptsp">
            <Button
              variant="outline"
              className="w-full rounded-xl h-12 font-semibold text-sm"
              style={{ borderColor: "rgba(240,180,41,0.3)", backgroundColor: "rgba(240,180,41,0.08)", color: "#f0b429" }}
            >
              Input Laporan Baru
            </Button>
          </Link>
          <Link href="/ptsp">
            <Button
              variant="ghost"
              className="w-full rounded-xl h-12 text-sm"
              style={{ color: "#a8d5b5" }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Panel PTSP
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
