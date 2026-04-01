"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Brain, Sparkles, Copy, Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { kode: "KORUPSI", nama: "Tindak Pidana Korupsi", warna: "#dc2626" },
  { kode: "NARKOTIKA", nama: "Narkotika & Psikotropika", warna: "#7c3aed" },
  { kode: "PIDANA_UMUM", nama: "Tindak Pidana Umum", warna: "#ea580c" },
  { kode: "PERDATA", nama: "Perdata & Sipil", warna: "#0284c7" },
  { kode: "KETENAGAKERJAAN", nama: "Ketenagakerjaan", warna: "#16a34a" },
  { kode: "LINGKUNGAN", nama: "Lingkungan Hidup", warna: "#15803d" },
  { kode: "KONSULTASI", nama: "Konsultasi Hukum", warna: "#0369a1" },
  { kode: "LAINNYA", nama: "Lainnya", warna: "#6b7280" },
];

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-green-400 bg-green-500/10 border-green-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  low: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function AiAssistantPage() {
  // ── Tab 1: Kategorisasi ──────────────────────────────
  const [laporanText, setLaporanText] = useState("");
  const [catResult, setCatResult] = useState<{
    kategori: string; confidence: number; alasan: string; bidangSaran: string;
  } | null>(null);
  const [catLoading, setCatLoading] = useState(false);

  // ── Tab 2: Generate Reply ─────────────────────────────
  const [selKategori, setSelKategori] = useState("");
  const [konteks, setKonteks] = useState("");
  const [templates, setTemplates] = useState<string[]>([]);
  const [replyLoading, setReplyLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"kategorisasi" | "reply">("kategorisasi");

  // Kategorisasi
  const handleKategorisasi = async () => {
    if (!laporanText.trim()) return toast.error("Masukkan teks laporan");
    setCatLoading(true);
    setCatResult(null);
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isiLaporan: laporanText }),
      });
      const data = await res.json();
      setCatResult(data);
    } catch {
      toast.error("Gagal mengkategorisasi");
    } finally {
      setCatLoading(false);
    }
  };

  // Generate Reply
  const handleGenerateReply = async () => {
    if (!selKategori) return toast.error("Pilih kategori laporan");
    setReplyLoading(true);
    setTemplates([]);
    try {
      const res = await fetch("/api/ai/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kategori: selKategori, isiLaporan: konteks }),
      });
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch {
      toast.error("Gagal generate template");
    } finally {
      setReplyLoading(false);
    }
  };

  const confidenceLevel = (c: number) =>
    c >= 0.8 ? "high" : c >= 0.5 ? "medium" : "low";

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-400" />
          Asisten AI SAHATE
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Tools berbasis AI Gemini untuk membantu pengelolaan layanan SAHATE
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 border border-white/10 p-1 rounded-2xl w-fit">
        {[
          { key: "kategorisasi", label: "Kategorisasi Laporan", icon: Brain },
          { key: "reply", label: "Generate Balasan WA", icon: Send },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-amber-500 text-slate-950"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* ─── KATEGORISASI ──────────────────────────────── */}
        {activeTab === "kategorisasi" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <Label className="text-slate-300 mb-2 block">Teks Laporan</Label>
              <Textarea
                placeholder="Tempel atau ketik isi laporan di sini untuk dikategorikan secara otomatis oleh AI..."
                value={laporanText}
                onChange={(e) => setLaporanText(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 rounded-xl min-h-[150px] resize-none"
              />
              <div className="flex items-center gap-3 mt-3">
                <Button
                  onClick={handleKategorisasi}
                  disabled={catLoading}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl gap-2"
                >
                  {catLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                      Menganalisis...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      Kategorisasi
                    </>
                  )}
                </Button>
                {laporanText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setLaporanText(""); setCatResult(null); }}
                    className="text-slate-400 hover:text-white rounded-xl"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Result */}
            {catResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl bg-white/5 border border-white/10 p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Kategori Terdeteksi</div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            CATEGORIES.find((c) => c.kode === catResult.kategori)?.warna ??
                            "#6b7280",
                        }}
                      />
                      <span className="font-bold text-lg">
                        {CATEGORIES.find((c) => c.kode === catResult.kategori)?.nama ??
                          catResult.kategori}
                      </span>
                    </div>
                  </div>
                  <Badge
                    className={`border text-sm font-semibold ${
                      CONFIDENCE_COLORS[confidenceLevel(catResult.confidence)]
                    }`}
                  >
                    {Math.round(catResult.confidence * 100)}% yakin
                  </Badge>
                </div>

                <div className="rounded-xl bg-white/5 p-3 text-sm text-slate-300 mb-4">
                  <span className="text-slate-500 text-xs block mb-1">Alasan AI:</span>
                  {catResult.alasan}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Bidang yang disarankan:</span>
                  <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20">
                    {catResult.bidangSaran}
                  </Badge>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ─── GENERATE REPLY ───────────────────────────── */}
        {activeTab === "reply" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
              <div>
                <Label className="text-slate-300 mb-2 block">Kategori Laporan</Label>
                <Select value={selKategori} onValueChange={(v) => setSelKategori(v ?? "")}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white h-10 rounded-xl">
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/20">
                    {CATEGORIES.map((cat) => (
                      <SelectItem
                        key={cat.kode}
                        value={cat.kode}
                        className="text-white focus:bg-white/10"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cat.warna }}
                          />
                          {cat.nama}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300 mb-2 block">
                  Konteks Laporan{" "}
                  <span className="text-slate-500 font-normal">(opsional)</span>
                </Label>
                <Textarea
                  placeholder="Ringkasan singkat laporan untuk konteks yang lebih akurat..."
                  value={konteks}
                  onChange={(e) => setKonteks(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 rounded-xl min-h-[80px] resize-none"
                />
              </div>

              <Button
                onClick={handleGenerateReply}
                disabled={replyLoading}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl gap-2"
              >
                {replyLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    Membuat template...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Template Balasan
                  </>
                )}
              </Button>
            </div>

            {/* Templates */}
            {templates.length > 0 && (
              <div className="space-y-3">
                {templates.map((tpl, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-2xl bg-white/5 border border-white/10 p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                        {["Singkat", "Menengah", "Formal"][i] ?? `Template ${i + 1}`}
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(tpl);
                          toast.success("Template disalin!");
                        }}
                        className="h-7 text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Salin
                      </Button>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap bg-white/5 rounded-xl p-4">
                      {tpl}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      * Ganti [NAMA] dan [NOMOR] dengan data pelapor
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
