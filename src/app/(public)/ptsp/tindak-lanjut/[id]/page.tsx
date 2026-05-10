import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileSearch, ShieldCheck } from "lucide-react";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { ptspVisitLogs, reports, categories, disposisi, bidang } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { hasPtspAccess } from "@/lib/ptsp-auth";

const STATUS_TEXT: Record<string, string> = {
  masuk: "Laporan sudah diterima dan menunggu proses lanjutan.",
  disposisi: "Laporan sudah diteruskan ke seksi terkait untuk ditindaklanjuti.",
  diproses: "Laporan sedang aktif diproses oleh seksi terkait.",
  menunggu_data_tambahan: "Laporan menunggu data tambahan dari pelapor sebelum penanganan dapat dilanjutkan.",
  selesai: "Laporan telah selesai ditindaklanjuti.",
};

export default async function PtspFollowUpResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await hasPtspAccess())) {
    redirect("/ptsp");
  }

  const { id } = await params;
  const visitId = parseInt(id);

  if (Number.isNaN(visitId)) notFound();

  const [visit] = await db
    .select()
    .from(ptspVisitLogs)
    .where(eq(ptspVisitLogs.id, visitId))
    .limit(1);

  if (!visit?.reportId) notFound();

  const [report] = await db
    .select({
      nomorLaporan: reports.nomorLaporan,
      nama: reports.nama,
      status: reports.status,
      outcomeSummary: reports.outcomeSummary,
      outcomeFollowUp: reports.outcomeFollowUp,
      kategoriNama: categories.nama,
    })
    .from(reports)
    .leftJoin(categories, eq(reports.kategoriId, categories.id))
    .where(eq(reports.id, visit.reportId))
    .limit(1);

  if (!report) notFound();

  const [latestDisposisi] = await db
    .select({
      bidangNama: bidang.nama,
    })
    .from(disposisi)
    .leftJoin(bidang, eq(disposisi.bidangId, bidang.id))
    .where(eq(disposisi.reportId, visit.reportId))
    .orderBy(desc(disposisi.disposedAt))
    .limit(1);

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#071f0d" }}>
      <div className="fixed top-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />

      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-[28px] p-6" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" }}>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(240,180,41,0.14)" }}>
              <FileSearch className="w-6 h-6" style={{ color: "#f0b429" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "#f5c518" }}>
                Tindak Lanjut Laporan
              </h1>
              <p className="mt-1 text-sm" style={{ color: "#a8d5b5" }}>
                Kunjungan PTSP Anda sudah dicatat. Berikut status terakhir laporan yang ditanyakan.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] p-6 space-y-4" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono tracking-wide" style={{ color: "#f0b429" }}>
                {report.nomorLaporan}
              </div>
              <h2 className="mt-1 text-xl font-bold" style={{ color: "#f5c518" }}>
                {report.nama === "Anonim" ? "Pelapor Anonim" : report.nama}
              </h2>
            </div>
            <div className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: "rgba(240,180,41,0.12)", color: "#f0b429" }}>
              {report.status}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.10)" }}>
              <div className="text-xs" style={{ color: "rgba(168,213,181,0.65)" }}>Kategori</div>
              <div className="mt-1 text-sm font-semibold" style={{ color: "#c8e6d0" }}>
                {report.kategoriNama ?? "Belum ditentukan"}
              </div>
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.10)" }}>
              <div className="text-xs" style={{ color: "rgba(168,213,181,0.65)" }}>Seksi Terkait</div>
              <div className="mt-1 text-sm font-semibold" style={{ color: "#c8e6d0" }}>
                {latestDisposisi?.bidangNama ?? "Belum didisposisikan"}
              </div>
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.10)" }}>
              <div className="text-xs" style={{ color: "rgba(168,213,181,0.65)" }}>Kartu Visitor</div>
              <div className="mt-1 text-sm font-mono font-semibold" style={{ color: "#c8e6d0" }}>
                {visit.visitorCardNumber ?? "-"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: "rgba(240,180,41,0.07)", border: "1px solid rgba(240,180,41,0.14)" }}>
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#f5c518" }}>
              <ShieldCheck className="w-4 h-4" />
              Status Terakhir
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "#c8e6d0" }}>
              {STATUS_TEXT[report.status] ?? "Laporan sedang diproses."}
            </p>
            {report.outcomeSummary && (
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "#c8e6d0" }}>
                Ringkasan hasil: {report.outcomeSummary}
              </p>
            )}
            {report.outcomeFollowUp && (
              <p className="mt-2 text-xs leading-relaxed" style={{ color: "rgba(168,213,181,0.75)" }}>
                Tindak lanjut: {report.outcomeFollowUp}
              </p>
            )}
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.16)" }}>
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#86efac" }}>
              <CheckCircle2 className="w-4 h-4" />
              Verifikasi Kunjungan Tersimpan
            </div>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "#c8e6d0" }}>
              Foto KTP dan foto webcam tamu sudah tercatat sebagai bagian dari verifikasi awal PTSP untuk permintaan tindak lanjut ini.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/ptsp" className="flex-1">
            <Button className="w-full rounded-xl h-12 font-semibold" style={{ backgroundColor: "#f0b429", color: "#071f0d" }}>
              Buat Permintaan PTSP Lain
            </Button>
          </Link>
          <Link href="/ptsp" className="flex-1">
            <Button variant="ghost" className="w-full rounded-xl h-12" style={{ color: "#a8d5b5" }}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Panel PTSP
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
