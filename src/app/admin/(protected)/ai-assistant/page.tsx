"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Brain,
  Sparkles,
  Copy,
  Send,
  RotateCcw,
  BookOpen,
  Save,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

interface KnowledgeEntry {
  id: number;
  title: string;
  content: string;
  tags: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const emptyKnowledgeForm = {
  id: null as number | null,
  title: "",
  content: "",
  tags: "",
  isActive: true,
};

export default function AiAssistantPage() {
  const [laporanText, setLaporanText] = useState("");
  const [catResult, setCatResult] = useState<{
    kategori: string; confidence: number; alasan: string; bidangSaran: string;
  } | null>(null);
  const [catLoading, setCatLoading] = useState(false);

  const [selKategori, setSelKategori] = useState("");
  const [konteks, setKonteks] = useState("");
  const [templates, setTemplates] = useState<string[]>([]);
  const [replyLoading, setReplyLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<"kategorisasi" | "reply" | "knowledge">("kategorisasi");
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(true);
  const [knowledgeSaving, setKnowledgeSaving] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState(emptyKnowledgeForm);

  const loadKnowledge = async () => {
    setKnowledgeLoading(true);
    try {
      const res = await fetch("/api/ai/knowledge");
      const data = await res.json();
      setKnowledgeEntries(data.data ?? []);
    } catch {
      toast.error("Gagal memuat bank data AI");
    } finally {
      setKnowledgeLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledge();
  }, []);

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

  const handleSaveKnowledge = async () => {
    if (!knowledgeForm.title.trim() || !knowledgeForm.content.trim()) {
      return toast.error("Judul dan isi bank data wajib diisi");
    }

    setKnowledgeSaving(true);
    try {
      const method = knowledgeForm.id ? "PATCH" : "POST";
      const res = await fetch("/api/ai/knowledge", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(knowledgeForm),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan data");
      }

      toast.success(knowledgeForm.id ? "Bank data diperbarui" : "Bank data ditambahkan");
      setKnowledgeForm(emptyKnowledgeForm);
      await loadKnowledge();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan bank data");
    } finally {
      setKnowledgeSaving(false);
    }
  };

  const handleDeleteKnowledge = async (id: number) => {
    try {
      const res = await fetch(`/api/ai/knowledge?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus data");
      }

      toast.success("Bank data dihapus");
      if (knowledgeForm.id === id) {
        setKnowledgeForm(emptyKnowledgeForm);
      }
      await loadKnowledge();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus bank data");
    }
  };

  const confidenceLevel = (c: number) =>
    c >= 0.8 ? "high" : c >= 0.5 ? "medium" : "low";

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-400" />
          Asisten AI SAHATE
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Kelola AI yang membantu admin membalas warga dengan hangat, rapi, dan tetap patuh pada bank data resmi.
        </p>
      </div>

      <div className="flex gap-1 bg-white/5 border border-white/10 p-1 rounded-2xl w-fit flex-wrap">
        {[
          { key: "kategorisasi", label: "Kategorisasi Laporan", icon: Brain },
          { key: "reply", label: "Generate Balasan WA", icon: Send },
          { key: "knowledge", label: "Bank Data AI", icon: BookOpen },
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
        {activeTab === "kategorisasi" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <Label className="text-slate-300 mb-2 block">Teks Laporan</Label>
              <Textarea
                placeholder="Tempel atau ketik isi laporan di sini untuk dikategorikan otomatis..."
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
                  {catLoading ? "Menganalisis..." : "Kategorisasi"}
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
                        {cat.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300 mb-2 block">
                  Konteks Laporan <span className="text-slate-500 font-normal">(opsional)</span>
                </Label>
                <Textarea
                  placeholder="Tambahkan konteks agar AI menyusun template balasan lebih relevan..."
                  value={konteks}
                  onChange={(e) => setKonteks(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 rounded-xl min-h-[140px] resize-none"
                />
              </div>

              <Button
                onClick={handleGenerateReply}
                disabled={replyLoading}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl gap-2"
              >
                {replyLoading ? "Membuat template..." : "Generate Balasan WA"}
              </Button>
            </div>

            {templates.length > 0 && (
              <div className="space-y-3">
                {templates.map((tpl, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20">
                        Template {i + 1}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-300"
                        onClick={() => {
                          navigator.clipboard.writeText(tpl);
                          toast.success("Template disalin");
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                      {tpl}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "knowledge" && (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg text-white">Bank Data AI</h2>
                  <p className="text-sm text-slate-400">
                    Isi pengetahuan resmi yang boleh dijadikan dasar jawaban AI di WhatsApp dan asisten hukum.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-300"
                  onClick={() => setKnowledgeForm(emptyKnowledgeForm)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Baru
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-slate-300 mb-2 block">Judul</Label>
                  <Input
                    value={knowledgeForm.title}
                    onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Contoh: Jam layanan konsultasi hukum"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-slate-300 mb-2 block">Tags</Label>
                  <Input
                    value={knowledgeForm.tags}
                    onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder="Contoh: jam layanan, konsultasi, kantor"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-slate-300 mb-2 block">Isi Bank Data</Label>
                  <Textarea
                    value={knowledgeForm.content}
                    onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="Tulis informasi resmi yang boleh dipakai AI. Semakin jelas dan spesifik, semakin bagus."
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 rounded-xl min-h-[180px] resize-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div>
                    <div className="text-sm font-medium text-white">Status Bank Data</div>
                    <div className="text-xs text-slate-400">Hanya data aktif yang boleh dipakai AI.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setKnowledgeForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                      knowledgeForm.isActive
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                        : "bg-slate-500/15 text-slate-300 border border-slate-500/25"
                    }`}
                  >
                    {knowledgeForm.isActive ? "Aktif" : "Nonaktif"}
                  </button>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveKnowledge}
                    disabled={knowledgeSaving}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {knowledgeSaving ? "Menyimpan..." : knowledgeForm.id ? "Perbarui" : "Simpan"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-slate-300 rounded-xl"
                    onClick={() => setKnowledgeForm(emptyKnowledgeForm)}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="mb-4">
                <h2 className="font-semibold text-lg text-white">Daftar Referensi</h2>
                <p className="text-sm text-slate-400">
                  Data di sini menjadi rujukan utama AI saat menjawab warga.
                </p>
              </div>

              <div className="space-y-3 max-h-[640px] overflow-auto pr-1">
                {knowledgeLoading ? (
                  <div className="text-sm text-slate-400">Memuat bank data...</div>
                ) : knowledgeEntries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                    Belum ada bank data. Tambahkan informasi resmi agar AI tidak menjawab ngawur.
                  </div>
                ) : (
                  knowledgeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-white">{entry.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={entry.isActive
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-300 border-slate-500/20"}
                            >
                              {entry.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                            {entry.tags ? (
                              <span className="text-xs text-slate-500">{entry.tags}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-300"
                            onClick={() =>
                              setKnowledgeForm({
                                id: entry.id,
                                title: entry.title,
                                content: entry.content,
                                tags: entry.tags ?? "",
                                isActive: entry.isActive,
                              })
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-300"
                            onClick={() => handleDeleteKnowledge(entry.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                        {entry.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
