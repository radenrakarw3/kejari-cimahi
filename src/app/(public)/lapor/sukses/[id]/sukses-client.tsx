"use client";

import { motion } from "framer-motion";
import { CheckCircle, Copy, MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface SuksesClientProps {
  report: {
    id: number;
    nomorLaporan: string;
    nama: string;
    nomorWa: string;
    kelurahan: string;
    createdAt: Date | null;
  };
}

export function SuksesClient({ report }: SuksesClientProps) {
  const [copied, setCopied] = useState(false);
  const [quickRating, setQuickRating] = useState(0);
  const hasWhatsApp = report.nomorWa?.trim().length > 0;

  const copyNomor = () => {
    navigator.clipboard.writeText(report.nomorLaporan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Nomor laporan disalin!");
  };

  const cardStyle = { backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.2)" };

  return (
    <div className="space-y-4">
      {/* Success card */}
      <div className="rounded-3xl p-8 text-center" style={cardStyle}>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
          className="flex justify-center mb-6"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(240,180,41,0.15)", border: "2px solid rgba(240,180,41,0.4)" }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: "#f0b429" }} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5c518" }}>Laporan Berhasil Dikirim!</h1>
          <p className="text-sm mb-8" style={{ color: "#a8d5b5" }}>
            Halo {report.nama}, laporan Anda telah kami terima.
          </p>

          {/* Nomor laporan */}
          <div
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: "rgba(240,180,41,0.1)", border: "1px solid rgba(240,180,41,0.3)" }}
          >
            <div className="text-xs mb-2 font-medium uppercase tracking-wider" style={{ color: "rgba(240,180,41,0.7)" }}>
              Nomor Laporan Anda
            </div>
            <div className="text-2xl font-bold tracking-wider font-mono mb-4" style={{ color: "#f0b429" }}>
              {report.nomorLaporan}
            </div>
            <button
              onClick={copyNomor}
              className="inline-flex items-center gap-2 text-xs rounded-full px-4 py-1.5 transition-all"
              style={{
                color: copied ? "#4ade80" : "#a8d5b5",
                backgroundColor: "rgba(168,213,181,0.08)",
                border: "1px solid rgba(168,213,181,0.2)",
              }}
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Tersalin!" : "Salin nomor laporan"}
            </button>
          </div>

          {/* WA notice */}
          <div
            className="flex items-start gap-3 text-left rounded-2xl p-4"
            style={{ backgroundColor: "rgba(240,180,41,0.07)", border: "1px solid rgba(240,180,41,0.18)" }}
          >
            <MessageSquare className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#f0b429" }} />
            <div>
              <div className="text-sm font-medium mb-1" style={{ color: "#f5c518" }}>
                {hasWhatsApp ? "Konfirmasi via WhatsApp" : "Konfirmasi Manual"}
              </div>
              <div className="text-xs" style={{ color: "#a8d5b5" }}>
                {hasWhatsApp ? (
                  <>
                    Konfirmasi SAHATE dikirim ke{" "}
                    <span className="font-mono" style={{ color: "#c8e6d0" }}>{report.nomorWa}</span>
                  </>
                ) : (
                  "Nomor WhatsApp tidak diisi, jadi simpan nomor laporan ini untuk tindak lanjut manual oleh petugas."
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-2xl p-5 text-center"
        style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.15)" }}
      >
        <Star className="w-6 h-6 mx-auto mb-2" style={{ color: "#f0b429" }} />
        <div className="font-semibold text-sm mb-1" style={{ color: "#f5c518" }}>
          Kesan Awal Pengalaman Anda
        </div>
        <p className="text-xs mb-4" style={{ color: "#a8d5b5" }}>
          Setelah mengirim pengaduan, beri penilaian singkat 1 sampai 5 bintang untuk pengalaman awal Anda di SAHATE.
          Survey SKM resmi akan kami kirim melalui WhatsApp.
        </p>

        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => {
                setQuickRating(star);
                toast.success(`Terima kasih, Anda memberi ${star} bintang.`);
              }}
              className="transition-transform"
              style={{ transform: quickRating === star ? "scale(1.12)" : "scale(1)" }}
            >
              <Star
                className="w-8 h-8"
                style={{
                  color: star <= quickRating ? "#f5c518" : "rgba(240,180,41,0.35)",
                  fill: star <= quickRating ? "#f5c518" : "transparent",
                }}
              />
            </button>
          ))}
        </div>

        <p className="text-[11px] mt-3" style={{ color: "rgba(168,213,181,0.6)" }}>
          Link survey resmi SKM tersedia di pesan konfirmasi WhatsApp Anda.
        </p>
      </motion.div>
    </div>
  );
}
