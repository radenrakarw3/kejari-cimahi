import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { SkmSurveyForm } from "@/components/public/skm-survey-form";

export default async function PublicSurveyPage({
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
    })
    .from(reports)
    .where(eq(reports.id, reportId));

  if (!report) notFound();

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#071f0d" }}>
      <div className="h-1.5" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />

      <div
        className="px-4 h-14 flex items-center justify-between sticky top-0 z-10 shadow-md"
        style={{ backgroundColor: "#0a3d1a", borderBottom: "1px solid rgba(240,180,41,0.15)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center p-0.5"
            style={{ backgroundColor: "rgba(240,180,41,0.15)", border: "1px solid rgba(240,180,41,0.35)" }}
          >
            <Image src="/logo-kejari.svg" alt="Logo" width={28} height={28} className="object-contain" />
          </div>
          <span className="font-semibold text-sm" style={{ color: "#f0b429" }}>Survey SAHATE</span>
        </Link>
        <Link href="/" className="text-xs hover:underline" style={{ color: "#a8d5b5" }}>
          <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
          Beranda
        </Link>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-5">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5c518" }}>Survey Resmi SKM</h1>
            <p className="text-sm" style={{ color: "#a8d5b5" }}>
              Halo {report.nama}, terima kasih telah menggunakan layanan SAHATE Kejari Cimahi.
              Mohon isi survey resmi untuk laporan <span className="font-mono">{report.nomorLaporan}</span>.
            </p>
          </div>

          <SkmSurveyForm reportId={report.id} />
        </div>
      </div>
    </main>
  );
}
