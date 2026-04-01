"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
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

interface SkmSurveyFormProps {
  reportId: number;
}

export function SkmSurveyForm({ reportId }: SkmSurveyFormProps) {
  const [phase, setPhase] = useState<"idle" | "form" | "done">("form");
  const [answers, setAnswers] = useState<SKMAnswers>({});
  const [saran, setSaran] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = SKM_QUESTIONS.every((q) => answers[q.key] !== undefined);

  const handleSubmitSkm = async () => {
    if (!allAnswered) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/skm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          ...Object.fromEntries(SKM_QUESTIONS.map((q) => [q.key, answers[q.key]])),
          saran: saran.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setPhase("done");
    } catch {
      toast.error("Gagal mengirim survey, coba lagi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {phase === "form" && (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.2)" }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between border-b"
            style={{ backgroundColor: "#0a3d1a", borderColor: "rgba(240,180,41,0.12)" }}
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" style={{ color: "#f0b429" }} />
              <span className="font-bold text-sm" style={{ color: "#f5c518" }}>Survey Kepuasan Masyarakat (SKM)</span>
            </div>
            <button onClick={() => setPhase("done")} style={{ color: "#a8d5b5" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-xs" style={{ color: "#a8d5b5" }}>
              Mohon isi survey resmi layanan SAHATE Kejari Cimahi. Jawaban Anda membantu peningkatan mutu pelayanan publik.
            </p>

            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: "rgba(168,213,181,0.6)" }}>
                <span>{Object.keys(answers).length} dari {SKM_QUESTIONS.length} dijawab</span>
                <span style={{ color: allAnswered ? "#4ade80" : "#f0b429" }}>
                  {allAnswered ? "Siap dikirim" : "Belum selesai"}
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
                          backgroundColor: answers[q.key] === r.value ? "#f0b429" : "rgba(168,213,181,0.05)",
                          border: `1px solid ${answers[q.key] === r.value ? "#f0b429" : "rgba(168,213,181,0.15)"}`,
                          transform: answers[q.key] === r.value ? "scale(1.06)" : "scale(1)",
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
            </div>

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
                  Kirim Survey SKM
                </span>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {phase === "done" && (
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
            Survey resmi SAHATE Kejari Cimahi sudah kami terima.
          </p>
          <Button
            onClick={() => setPhase("form")}
            variant="ghost"
            className="mt-3 rounded-xl text-xs"
            style={{ color: "#f0b429" }}
          >
            Isi Lagi
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
