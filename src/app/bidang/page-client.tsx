"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { CheckCircle2, Clock3, MapPin, Phone, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type BidangReport = {
  id: number;
  nomorLaporan: string;
  nama: string;
  nomorWa: string;
  kelurahan: string;
  rw: string;
  isiLaporan: string;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  kategoriNama: string | null;
  kategoriWarna: string | null;
  catatanDisposisi: string | null;
  disposedAt: Date | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  masuk: { label: "Masuk", color: "#f5c518", bg: "rgba(245,197,24,0.15)" },
  disposisi: { label: "Disposisi", color: "#86efac", bg: "rgba(134,239,172,0.12)" },
  diproses: { label: "Diproses", color: "#f0b429", bg: "rgba(240,180,41,0.15)" },
  selesai: { label: "Selesai", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
};

interface BidangDashboardClientProps {
  bidangNama: string | null;
  reports: BidangReport[];
}

export function BidangDashboardClient({ bidangNama, reports }: BidangDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeFilter, setActiveFilter] = useState<"aktif" | "selesai">("aktif");

  const filteredReports = useMemo(() => {
    return reports.filter((report) =>
      activeFilter === "aktif" ? report.status !== "selesai" : report.status === "selesai"
    );
  }, [activeFilter, reports]);

  const updateStatus = (reportId: number, status: "diproses" | "selesai") => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reports/${reportId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Gagal memperbarui status");
        }

        toast.success(
          status === "diproses"
            ? "Laporan ditandai sedang diproses"
            : "Laporan ditandai selesai dan admin sudah menerima update"
        );
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "aktif", label: "Perlu Ditindaklanjuti" },
          { key: "selesai", label: "Riwayat Selesai" },
        ].map((item) => {
          const isActive = activeFilter === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveFilter(item.key as "aktif" | "selesai")}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              style={
                isActive
                  ? { backgroundColor: "#f0b429", color: "#071f0d" }
                  : { backgroundColor: "rgba(240,180,41,0.08)", color: "#a8d5b5" }
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {filteredReports.length === 0 ? (
        <div
          className="rounded-3xl px-6 py-16 text-center"
          style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
        >
          <div className="text-lg font-semibold" style={{ color: "#f5c518" }}>
            Belum ada laporan pada tab ini
          </div>
          <p className="text-sm mt-2" style={{ color: "#a8d5b5" }}>
            Saat admin mengirim disposisi ke {bidangNama ?? "bidang ini"}, daftar pekerjaan akan muncul di sini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredReports.map((report) => {
            const statusConfig = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.disposisi;
            const isUpdating = isPending;

            return (
              <div
                key={report.id}
                className="rounded-[28px] p-5 space-y-5"
                style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-mono tracking-wide" style={{ color: "#f0b429" }}>
                      {report.nomorLaporan}
                    </div>
                    <h2 className="text-lg font-bold mt-1" style={{ color: "#f5c518" }}>
                      {report.nama}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs mt-2" style={{ color: "#a8d5b5" }}>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {report.kelurahan} RW {report.rw}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {report.nomorWa}
                      </span>
                    </div>
                  </div>

                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{ color: statusConfig.color, backgroundColor: statusConfig.bg }}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {report.kategoriNama && (
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{
                        color: report.kategoriWarna ?? "#f0b429",
                        backgroundColor: "rgba(255,255,255,0.05)",
                      }}
                    >
                      {report.kategoriNama}
                    </span>
                  )}
                  {report.disposedAt && (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{ color: "#a8d5b5", backgroundColor: "rgba(240,180,41,0.08)" }}
                    >
                      Disposisi {format(new Date(report.disposedAt), "dd MMM yyyy, HH:mm", { locale: id })}
                    </span>
                  )}
                </div>

                <div
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.12)" }}
                >
                  <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: "#f0b429" }}>
                    Isi Laporan
                  </div>
                  <p className="text-sm leading-6 whitespace-pre-wrap" style={{ color: "#c8e6d0" }}>
                    {report.isiLaporan}
                  </p>
                </div>

                <div
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: "rgba(240,180,41,0.07)", border: "1px solid rgba(240,180,41,0.12)" }}
                >
                  <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: "#f0b429" }}>
                    Catatan Admin
                  </div>
                  <p className="text-sm leading-6 whitespace-pre-wrap" style={{ color: "#c8e6d0" }}>
                    {report.catatanDisposisi?.trim() || "Tidak ada catatan tambahan dari admin."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs" style={{ color: "rgba(168,213,181,0.75)" }}>
                    Diterima {report.createdAt ? format(new Date(report.createdAt), "dd MMMM yyyy, HH:mm", { locale: id }) : "-"}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {report.status === "disposisi" && (
                      <Button
                        onClick={() => updateStatus(report.id, "diproses")}
                        disabled={isUpdating}
                        className="rounded-xl"
                        style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
                      >
                        <Clock3 className="w-4 h-4 mr-1.5" />
                        Tandai Proses
                      </Button>
                    )}

                    {report.status !== "selesai" && (
                      <Button
                        onClick={() => updateStatus(report.id, "selesai")}
                        disabled={isUpdating}
                        className="rounded-xl"
                        style={{ backgroundColor: "rgba(74,222,128,0.14)", color: "#86efac", border: "1px solid rgba(74,222,128,0.25)" }}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                        Tandai Selesai
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(168,213,181,0.65)" }}>
                  <SendHorizonal className="w-3.5 h-3.5" />
                  Warga akan otomatis menerima notifikasi saat status masuk proses atau selesai.
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
