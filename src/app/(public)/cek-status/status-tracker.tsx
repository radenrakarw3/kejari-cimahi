"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Search, ShieldCheck, FileSearch, Clock3, Building2, CheckCircle2, ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type StatusResult = {
  nomorLaporan: string;
  nama: string;
  isAnonymous: boolean;
  kelurahan: string;
  rw: string;
  status: string;
  statusLabel: string;
  kategoriNama: string;
  source: string;
  outcomeType: string | null;
  outcomeSummary: string | null;
  outcomeFollowUp: string | null;
  additionalInfoRequest: string | null;
  additionalInfoRequestedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  bidangNama: string | null;
  disposedAt: string | null;
};

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  masuk: { color: "#f5c518", bg: "rgba(245,197,24,0.15)" },
  disposisi: { color: "#86efac", bg: "rgba(134,239,172,0.12)" },
  diproses: { color: "#f0b429", bg: "rgba(240,180,41,0.15)" },
  menunggu_data_tambahan: { color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  selesai: { color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return format(new Date(value), "dd MMMM yyyy, HH:mm", { locale: id });
}

export function StatusTracker({ initialNomorLaporan = "" }: { initialNomorLaporan?: string }) {
  const [nomorLaporan, setNomorLaporan] = useState(initialNomorLaporan);
  const [nomorWa, setNomorWa] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StatusResult | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/public/report-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomorLaporan, nomorWa }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Gagal memeriksa status laporan");
      }

      setResult(data.data);
    } catch (error) {
      setResult(null);
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const statusStyle = result ? STATUS_STYLES[result.status] ?? STATUS_STYLES.masuk : STATUS_STYLES.masuk;

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div
        className="rounded-[28px] p-5 sm:p-6"
        style={{
          background:
            "linear-gradient(180deg, rgba(240,180,41,0.08) 0%, rgba(8,36,17,0.86) 16%, rgba(9,43,19,0.96) 100%)",
          border: "1px solid rgba(240,180,41,0.16)",
          boxShadow: "0 30px 80px rgba(3, 14, 7, 0.28)",
        }}
      >
        <div className="flex items-start gap-3 rounded-2xl px-4 py-4" style={{ backgroundColor: "rgba(240,180,41,0.08)", border: "1px solid rgba(240,180,41,0.16)" }}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(240,180,41,0.14)" }}>
            <FileSearch className="w-5 h-5" style={{ color: "#f0b429" }} />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#f0b429" }}>
              Pelacakan Laporan
            </div>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "#c8e6d0" }}>
              Masukkan nomor laporan. Jika saat melapor Anda mengisi nomor WhatsApp, masukkan nomor yang sama untuk verifikasi.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="space-y-2">
            <Label style={{ color: "#f0b429" }}>Nomor Laporan</Label>
            <Input
              value={nomorLaporan}
              onChange={(e) => setNomorLaporan(e.target.value.toUpperCase())}
              placeholder="Contoh: LPR-2026-0001"
              className="h-12 rounded-xl"
              style={{ backgroundColor: "rgba(7,31,13,0.42)", borderColor: "rgba(240,180,41,0.18)", color: "#c8e6d0" }}
            />
          </div>

          <div className="space-y-2">
            <Label style={{ color: "#f0b429" }}>Nomor WhatsApp</Label>
            <Input
              value={nomorWa}
              onChange={(e) => setNomorWa(e.target.value)}
              placeholder="Kosongkan jika laporan anonim"
              className="h-12 rounded-xl"
              style={{ backgroundColor: "rgba(7,31,13,0.42)", borderColor: "rgba(240,180,41,0.18)", color: "#c8e6d0" }}
            />
          </div>

          <Button
            onClick={handleSearch}
            disabled={loading}
            className="h-12 rounded-xl font-bold text-sm"
            style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
          >
            <Search className="w-4 h-4 mr-2" />
            {loading ? "Memeriksa..." : "Cek Status Laporan"}
          </Button>
        </div>
      </div>

      {result && (
        <div className="space-y-4 rounded-[28px] p-5 sm:p-6" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-mono tracking-wide" style={{ color: "#f0b429" }}>
                {result.nomorLaporan}
              </div>
              <h2 className="mt-1 text-xl font-bold" style={{ color: "#f5c518" }}>
                {result.nama}
              </h2>
              <div className="mt-2 text-sm" style={{ color: "#a8d5b5" }}>
                {result.kelurahan} RW {result.rw}
              </div>
            </div>

            <span
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ color: statusStyle.color, backgroundColor: statusStyle.bg }}
            >
              {result.statusLabel}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(7,31,13,0.42)", border: "1px solid rgba(240,180,41,0.14)" }}>
              <div className="text-xs" style={{ color: "rgba(168,213,181,0.65)" }}>Kategori</div>
              <div className="mt-1 text-sm font-semibold" style={{ color: "#c8e6d0" }}>{result.kategoriNama}</div>
            </div>
            <div className="rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(7,31,13,0.42)", border: "1px solid rgba(240,180,41,0.14)" }}>
              <div className="text-xs" style={{ color: "rgba(168,213,181,0.65)" }}>Jenis Pelaporan</div>
              <div className="mt-1 text-sm font-semibold" style={{ color: "#c8e6d0" }}>
                {result.isAnonymous ? "Anonim" : "Dengan Identitas"}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl p-4" style={{ backgroundColor: "rgba(240,180,41,0.07)", border: "1px solid rgba(240,180,41,0.12)" }}>
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 w-4 h-4 flex-shrink-0" style={{ color: "#f0b429" }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: "#f5c518" }}>Laporan diterima</div>
                <div className="text-xs" style={{ color: "#a8d5b5" }}>{formatDate(result.createdAt)}</div>
              </div>
            </div>

            {result.bidangNama && (
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 w-4 h-4 flex-shrink-0" style={{ color: "#f0b429" }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#f5c518" }}>
                    Diteruskan ke seksi {result.bidangNama}
                  </div>
                  <div className="text-xs" style={{ color: "#a8d5b5" }}>{formatDate(result.disposedAt)}</div>
                </div>
              </div>
            )}

            {(result.status === "diproses" || result.status === "selesai") && (
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 w-4 h-4 flex-shrink-0" style={{ color: "#f0b429" }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#f5c518" }}>
                    Laporan sedang ditangani tim terkait
                  </div>
                  <div className="text-xs" style={{ color: "#a8d5b5" }}>{formatDate(result.updatedAt)}</div>
                </div>
              </div>
            )}

            {result.status === "menunggu_data_tambahan" && (
              <div className="flex items-start gap-3">
                <MessageSquare className="mt-0.5 w-4 h-4 flex-shrink-0" style={{ color: "#f97316" }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#fdba74" }}>
                    Kami menunggu data tambahan dari Anda
                  </div>
                  <div className="text-xs" style={{ color: "#a8d5b5" }}>
                    {formatDate(result.additionalInfoRequestedAt ?? result.updatedAt)}
                  </div>
                  {result.additionalInfoRequest && (
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: "#c8e6d0" }}>
                      {result.additionalInfoRequest}
                    </p>
                  )}
                </div>
              </div>
            )}

            {result.status === "selesai" && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 w-4 h-4 flex-shrink-0" style={{ color: "#4ade80" }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#86efac" }}>
                    Penanganan telah selesai
                  </div>
                  <div className="text-xs" style={{ color: "#a8d5b5" }}>{formatDate(result.updatedAt)}</div>
                  {result.outcomeSummary && (
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: "#c8e6d0" }}>
                      {result.outcomeSummary}
                    </p>
                  )}
                  {result.outcomeFollowUp && (
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: "rgba(168,213,181,0.72)" }}>
                      Tindak lanjut: {result.outcomeFollowUp}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <p className="text-xs leading-relaxed" style={{ color: "rgba(168,213,181,0.72)" }}>
            Informasi publik ini menampilkan status penanganan secara ringkas. Untuk kerahasiaan pelapor, detail internal dan catatan petugas tidak ditampilkan.
          </p>
        </div>
      )}

      <div className="flex justify-center">
        <Link href="/">
          <Button
            variant="ghost"
            className="rounded-xl text-sm"
            style={{ color: "#a8d5b5" }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}
