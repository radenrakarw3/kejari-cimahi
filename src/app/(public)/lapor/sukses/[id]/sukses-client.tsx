"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Copy, MessageSquare, Star, Send, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SKM_QUESTIONS = [
  { key: "u1", label: "Persyaratan layanan jelas dan mudah dipenuhi" },
  { key: "u2", label: "Prosedur pelayanan mudah dipahami" },
  { key: "u3", label: "Waktu penyelesaian sesuai harapan" },
  { key: "u4", label: "Tidak ada biaya/pungutan liar" },
  { key: "u5", label: "Hasil layanan sesuai yang dijanjikan" },
  { key: "u6", label: "Petugas memiliki kemampuan yang baik" },
  { key: "u7", label: "Petugas bersikap sopan dan ramah" },
  { key: "u8", label: "Pengaduan/keluhan ditangani dengan baik" },
  { key: "u9", label: "Fasilitas/sarana pelayanan memadai" },
] as const;

const RATINGS = [
  { value: 1, emoji: "😞", label: "Tidak Baik" },
  { value: 2, emoji: "😐", label: "Kurang Baik" },
  { value: 3, emoji: "🙂", label: "Baik" },
  { value: 4, emoji: "😄", label: "Sangat Baik" },
];

type SKMAnswers = Record<string, number>;

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
  const [skmPhase, setSkmPhase] = useState<"idle" | "form" | "done">("idle");
  const [answers, setAnswers] = useState<SKMAnswers>({});
  const [saran, setSaran] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const copyNomor = () => {
    navigator.clipboard.writeText(report.nomorLaporan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Nomor laporan disalin!");
  };

  const allAnswered = SKM_QUESTIONS.every((q) => answers[q.key] !== undefined);

  const handleSubmitSkm = async () => {
    if (!allAnswered) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/skm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          ...Object.fromEntries(SKM_QUESTIONS.map((q) => [q.key, answers[q.key]])),
          saran: saran.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setSkmPhase("done");
    } catch {
      toast.error("Gagal mengirim survey, coba lagi");
    } finally {
      setSubmitting(false);
    }
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
              <div className="text-sm font-medium mb-1" style={{ color: "#f5c518" }}>Konfirmasi via WhatsApp</div>
              <div className="text-xs" style={{ color: "#a8d5b5" }}>
                Konfirmasi dikirim ke{" "}
                <span className="font-mono" style={{ color: "#c8e6d0" }}>{report.nomorWa}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* SKM Survey */}
      <AnimatePresence mode="wait">
        {skmPhase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl p-5 text-center"
            style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.15)" }}
          >
            <Star className="w-6 h-6 mx-auto mb-2" style={{ color: "#f0b429" }} />
            <div className="font-semibold text-sm mb-1" style={{ color: "#f5c518" }}>
              Bantu Kami Meningkatkan Layanan
            </div>
            <p className="text-xs mb-4" style={{ color: "#a8d5b5" }}>
              Isi survey kepuasan (SKM) hanya 1 menit — sangat berarti bagi kami
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => setSkmPhase("form")}
                className="font-bold rounded-xl px-6 text-sm"
                style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
              >
                Isi Survey Sekarang
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSkmPhase("done")}
                className="rounded-xl text-xs"
                style={{ color: "rgba(168,213,181,0.5)" }}
              >
                Lewati
              </Button>
            </div>
          </motion.div>
        )}

        {skmPhase === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.2)" }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between border-b"
              style={{ backgroundColor: "#0a3d1a", borderColor: "rgba(240,180,41,0.12)" }}
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" style={{ color: "#f0b429" }} />
                <span className="font-bold text-sm" style={{ color: "#f5c518" }}>Survey Kepuasan Masyarakat (SKM)</span>
              </div>
              <button onClick={() => setSkmPhase("idle")} style={{ color: "#a8d5b5" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs" style={{ color: "#a8d5b5" }}>
                Pilih penilaian untuk setiap aspek layanan. Jawaban Anda sangat membantu peningkatan layanan kami.
              </p>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: "rgba(168,213,181,0.6)" }}>
                  <span>{Object.keys(answers).length} dari {SKM_QUESTIONS.length} dijawab</span>
                  <span style={{ color: allAnswered ? "#4ade80" : "#f0b429" }}>
                    {allAnswered ? "Siap dikirim ✓" : "Belum selesai"}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(240,180,41,0.15)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(Object.keys(answers).length / SKM_QUESTIONS.length) * 100}%`,
                      backgroundColor: allAnswered ? "#4ade80" : "#f0b429",
                    }}
                  />
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-3">
                {SKM_QUESTIONS.map((q, idx) => (
                  <div
                    key={q.key}
                    className="rounded-xl p-3"
                    style={{
                      backgroundColor: answers[q.key] ? "rgba(240,180,41,0.07)" : "#145228",
                      border: `1px solid ${answers[q.key] ? "rgba(240,180,41,0.25)" : "rgba(240,180,41,0.1)"}`,
                    }}
                  >
                    <div className="text-xs mb-2.5 font-medium" style={{ color: "#c8e6d0" }}>
                      <span style={{ color: "rgba(240,180,41,0.6)" }}>{idx + 1}.</span> {q.label}
                    </div>
                    <div className="flex gap-2">
                      {RATINGS.map((r) => (
                        <button
                          key={r.value}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.key]: r.value }))}
                          className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all text-lg"
                          style={{
                            backgroundColor: answers[q.key] === r.value
                              ? "#f0b429"
                              : "rgba(168,213,181,0.05)",
                            border: `1px solid ${answers[q.key] === r.value ? "#f0b429" : "rgba(168,213,181,0.15)"}`,
                            transform: answers[q.key] === r.value ? "scale(1.08)" : "scale(1)",
                          }}
                          title={r.label}
                        >
                          <span>{r.emoji}</span>
                          <span
                            className="text-[9px] font-medium leading-none hidden sm:block"
                            style={{ color: answers[q.key] === r.value ? "#071f0d" : "rgba(168,213,181,0.5)" }}
                          >
                            {r.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Saran */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "#f0b429" }}>
                  Saran &amp; Masukan (opsional)
                </label>
                <Textarea
                  placeholder="Tulis saran atau masukan Anda untuk perbaikan layanan..."
                  value={saran}
                  onChange={(e) => setSaran(e.target.value)}
                  maxLength={500}
                  className="rounded-xl resize-none text-sm placeholder:opacity-40 min-h-[80px]"
                  style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
                />
                <div className="text-right text-xs mt-1" style={{ color: "rgba(168,213,181,0.4)" }}>
                  {saran.length}/500
                </div>
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmitSkm}
                disabled={!allAnswered || submitting}
                className="w-full h-11 font-bold rounded-xl text-sm"
                style={{
                  backgroundColor: allAnswered ? "#f0b429" : "rgba(240,180,41,0.2)",
                  color: allAnswered ? "#071f0d" : "rgba(168,213,181,0.4)",
                }}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#071f0d]/30 border-t-[#071f0d] rounded-full animate-spin" />
                    Mengirim...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Kirim Survey
                  </span>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {skmPhase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-6 text-center"
            style={{ backgroundColor: "#145228", border: "1px solid rgba(74,222,128,0.2)" }}
          >
            <div className="text-2xl mb-2">🙏</div>
            <div className="font-bold text-sm mb-1" style={{ color: "#4ade80" }}>Terima Kasih!</div>
            <p className="text-xs" style={{ color: "#a8d5b5" }}>
              Masukan Anda sangat berarti untuk meningkatkan kualitas layanan Kejari Cimahi.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
