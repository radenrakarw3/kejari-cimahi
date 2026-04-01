"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface KnowledgeEntry {
  id: number;
  title: string;
  content: string;
  tags: string | null;
  isActive: boolean;
}

const emptyKnowledgeForm = {
  id: null as number | null,
  title: "",
  content: "",
  tags: "",
  isActive: true,
};

export default function AiAssistantPage() {
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
      const res = await fetch(`/api/ai/knowledge?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menghapus data");
      }

      toast.success("Bank data dihapus");
      if (knowledgeForm.id === id) setKnowledgeForm(emptyKnowledgeForm);
      await loadKnowledge();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus bank data");
    }
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "#f5c518" }}>
          <BookOpen className="w-6 h-6" style={{ color: "#f0b429" }} />
          Bank Data AI
        </h1>
        <p className="text-sm mt-1" style={{ color: "#a8d5b5" }}>
          Kelola referensi resmi yang boleh dipakai asisten WhatsApp untuk menjawab warga.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-lg" style={{ color: "#f5c518" }}>Form Bank Data</h2>
              <p className="text-sm" style={{ color: "#a8d5b5" }}>
                Tambahkan informasi resmi agar jawaban WhatsApp tetap akurat.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setKnowledgeForm(emptyKnowledgeForm)} style={{ color: "#c8e6d0" }}>
              <Plus className="w-4 h-4 mr-1" />
              Baru
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="mb-2 block" style={{ color: "#f0b429" }}>Judul</Label>
              <Input
                value={knowledgeForm.title}
                onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Contoh: Jam layanan konsultasi hukum"
                className="rounded-xl"
                style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
              />
            </div>

            <div>
              <Label className="mb-2 block" style={{ color: "#f0b429" }}>Tags</Label>
              <Input
                value={knowledgeForm.tags}
                onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="Contoh: jam layanan, konsultasi, kantor"
                className="rounded-xl"
                style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
              />
            </div>

            <div>
              <Label className="mb-2 block" style={{ color: "#f0b429" }}>Isi Bank Data</Label>
              <Textarea
                value={knowledgeForm.content}
                onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Tulis informasi resmi yang boleh dipakai AI."
                className="rounded-xl min-h-[180px] resize-none"
                style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(240,180,41,0.12)" }}>
              <div>
                <div className="text-sm font-medium" style={{ color: "#f5c518" }}>Status Bank Data</div>
                <div className="text-xs" style={{ color: "#a8d5b5" }}>Hanya data aktif yang boleh dipakai AI.</div>
              </div>
              <button
                type="button"
                onClick={() => setKnowledgeForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={knowledgeForm.isActive
                  ? { backgroundColor: "rgba(74,222,128,0.12)", color: "#86efac", border: "1px solid rgba(74,222,128,0.25)" }
                  : { backgroundColor: "rgba(148,163,184,0.12)", color: "#cbd5e1", border: "1px solid rgba(148,163,184,0.25)" }}
              >
                {knowledgeForm.isActive ? "Aktif" : "Nonaktif"}
              </button>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSaveKnowledge} disabled={knowledgeSaving} className="rounded-xl font-semibold" style={{ backgroundColor: "#f0b429", color: "#071f0d" }}>
                <Save className="w-4 h-4 mr-1.5" />
                {knowledgeSaving ? "Menyimpan..." : knowledgeForm.id ? "Perbarui" : "Simpan"}
              </Button>
              <Button variant="ghost" onClick={() => setKnowledgeForm(emptyKnowledgeForm)} style={{ color: "#c8e6d0" }}>
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" }}>
          <div className="mb-4">
            <h2 className="font-semibold text-lg" style={{ color: "#f5c518" }}>Daftar Referensi</h2>
            <p className="text-sm" style={{ color: "#a8d5b5" }}>
              Data ini menjadi rujukan utama AI saat menjawab warga di WhatsApp.
            </p>
          </div>

          <div className="space-y-3 max-h-[640px] overflow-auto pr-1">
            {knowledgeLoading ? (
              <div className="text-sm" style={{ color: "#a8d5b5" }}>Memuat bank data...</div>
            ) : knowledgeEntries.length === 0 ? (
              <div className="rounded-xl p-4 text-sm" style={{ border: "1px dashed rgba(240,180,41,0.18)", color: "#a8d5b5" }}>
                Belum ada bank data.
              </div>
            ) : (
              knowledgeEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl p-4 space-y-3" style={{ border: "1px solid rgba(240,180,41,0.12)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium" style={{ color: "#f5c518" }}>{entry.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={entry.isActive ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-slate-500/10 text-slate-300 border-slate-500/20"}>
                          {entry.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                        {entry.tags ? <span className="text-xs" style={{ color: "#a8d5b5" }}>{entry.tags}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setKnowledgeForm({ id: entry.id, title: entry.title, content: entry.content, tags: entry.tags ?? "", isActive: entry.isActive })}
                        style={{ color: "#c8e6d0" }}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteKnowledge(entry.id)} style={{ color: "#fca5a5" }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: "#c8e6d0" }}>{entry.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
