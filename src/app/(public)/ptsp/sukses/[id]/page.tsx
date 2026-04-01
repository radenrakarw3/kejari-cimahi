import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuksesClient } from "../../../lapor/sukses/[id]/sukses-client";

export default async function PtspSuksesPage({
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
      createdAt: reports.createdAt,
    })
    .from(reports)
    .where(eq(reports.id, reportId));

  if (!report) notFound();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ backgroundColor: "#071f0d" }}>
      <div className="fixed top-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />

      <div className="w-full max-w-md">
        <SuksesClient report={report} />

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
          <Link href="/">
            <Button
              variant="ghost"
              className="w-full rounded-xl h-12 text-sm"
              style={{ color: "#a8d5b5" }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
