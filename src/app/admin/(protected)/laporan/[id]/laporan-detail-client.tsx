"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  ArrowLeft, Globe, MessageSquare, Laptop, MapPin, Clock, Send,
  Sparkles, ChevronDown, FileText, User, Phone, Home, Building2,
  CheckCircle2, Brain, Copy,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; next: string | null }> = {
  masuk:     { label: "Masuk",     color: "#f5c518", bg: "rgba(245,197,24,0.15)",    next: "diproses" },
  diproses:  { label: "Diproses",  color: "#f0b429", bg: "rgba(240,180,41,0.15)",    next: "selesai" },
  disposisi: { label: "Disposisi", color: "#86efac", bg: "rgba(134,239,172,0.12)",   next: "selesai" },
  selesai:   { label: "Selesai",   color: "#4ade80", bg: "rgba(74,222,128,0.12)",    next: null },
};

type Report = {
  id: number; nomorLaporan: string; nama: string; nomorWa: string;
  kelurahan: string; rw: string; isiLaporan: string; status: string;
  source: string; aiCategorySuggestion: string | null;
  aiConfidenceScore: string | null; aiAlasan: string | null;
  createdAt: Date | null; updatedAt: Date | null;
  kategoriId: number | null; kategoriNama: string | null;
  kategoriWarna: string | null; kategoriKode: string | null; kategoriIcon: string | null;
};

type DisposisiItem = {
  id: number; catatan: string | null; disposedAt: Date | null;
  bidangId: number; bidangNama: string | null; bidangKode: string | null;
};

type WaLog = {
  id: number; direction: string; content: string;
  phoneNumber: string; status: string; timestamp: Date | null;
};

type Bidang = { id: number; nama: string; kode: string; deskripsi: string | null };
type Category = { id: number; nama: string; kode: string; warna: string; icon: string };

interface Props {
  report: Report;
  disposisiList: DisposisiItem[];
  waLogsList: WaLog[];
  allBidang: Bidang[];
  allCategories: Category[];
}

const cardStyle = { backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" };
const inputStyle = { backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" };
const selectContentStyle = { backgroundColor: "#0a3d1a", borderColor: "rgba(240,180,41,0.2)" };

export function LaporanDetailClient({ report, disposisiList, waLogsList, allBidang, allCategories }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"info" | "disposisi" | "wa">("info");
  const [status, setStatus] = useState(report.status);
  const [kategoriId, setKategoriId] = useState<string>(report.kategoriId?.toString() ?? "");
  const [disposisiOpen, setDisposisiOpen] = useState(false);
  const [selBidang, setSelBidang] = useState("");
  const [catatan, setCatatan] = useState("");
  const [waMessage, setWaMessage] = useState("");
  const [waLogs, setWaLogs] = useState<WaLog[]>(waLogsList);
  const [aiTemplates, setAiTemplates] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [waLogs]);

  const SourceIcon = report.source === "wa" ? MessageSquare : report.source === "offline" ? Laptop : Globe;
  const sourceColor = report.source === "wa" ? "#4ade80" : report.source === "offline" ? "#a8d5b5" : "#f0b429";
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.masuk;

  const patchReport = async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/reports/${report.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Gagal menyimpan");
  };

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    try {
      await patchReport({ status: newStatus });
      setStatus(newStatus);
      toast.success("Status diperbarui");
      router.refresh();
    } catch { toast.error("Gagal memperbarui status"); }
    finally { setSaving(false); }
  };

  const handleKategoriChange = async (val: string) => {
    setKategoriId(val);
    await patchReport({ kategoriId: val ? parseInt(val) : null });
    toast.success("Kategori diperbarui");
    router.refresh();
  };

  const handleDisposisi = async () => {
    if (!selBidang) return toast.error("Pilih bidang");
    setSaving(true);
    try {
      await patchReport({ disposisi: { bidangId: parseInt(selBidang), catatan } });
      setDisposisiOpen(false);
      setStatus("disposisi");
      toast.success("Disposisi berhasil disimpan");
      router.refresh();
    } catch { toast.error("Gagal menyimpan disposisi"); }
    finally { setSaving(false); }
  };

  const handleSendWa = async () => {
    if (!waMessage.trim()) return;
    setSendingWa(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: report.nomorWa, message: waMessage, reportId: report.id }),
      });
      if (!res.ok) throw new Error("Gagal");
      setWaLogs((prev) => [...prev, {
        id: Date.now(), direction: "outbound", content: waMessage,
        phoneNumber: report.nomorWa, status: "sent", timestamp: new Date(),
      }]);
      setWaMessage("");
      toast.success("Pesan terkirim");
    } catch { toast.error("Gagal mengirim pesan WA"); }
    finally { setSendingWa(false); }
  };

  const generateAiReply = async () => {
    setAiLoading(true);
    setAiOpen(true);
    try {
      const res = await fetch("/api/ai/generate-reply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kategori: report.aiCategorySuggestion ?? "LAINNYA", isiLaporan: report.isiLaporan }),
      });
      const data = await res.json();
      setAiTemplates(data.templates ?? []);
    } catch { toast.error("Gagal generate template"); }
    finally { setAiLoading(false); }
  };

  const applyTemplate = (tpl: string) => {
    setWaMessage(tpl.replace("[NAMA]", report.nama).replace("[NOMOR]", report.nomorLaporan));
    setAiOpen(false);
    setActiveTab("wa");
  };

  const TABS: Array<{ key: "info" | "disposisi" | "wa"; label: string; icon: React.ElementType; badge?: number }> = [
    { key: "info", label: "Info Laporan", icon: FileText },
    { key: "disposisi", label: "Disposisi", icon: Building2, badge: disposisiList.length },
    { key: "wa", label: "Chat WA", icon: MessageSquare, badge: waLogs.filter(l => l.direction === "inbound").length },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Link href="/admin/laporan">
          <Button
            variant="ghost" size="icon"
            className="mt-1 rounded-xl"
            style={{ color: "#a8d5b5" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-xl font-bold font-mono" style={{ color: "#f5c518" }}>{report.nomorLaporan}</h1>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ color: statusCfg.color, backgroundColor: statusCfg.bg }}
            >
              {statusCfg.label}
            </span>
            <div className="flex items-center gap-1">
              <SourceIcon className="w-3.5 h-3.5" style={{ color: sourceColor }} />
              <span className="text-xs capitalize" style={{ color: "#a8d5b5" }}>{report.source}</span>
            </div>
          </div>
          <div className="text-sm" style={{ color: "#a8d5b5" }}>
            {report.nama} · {report.kelurahan} RW {report.rw} ·{" "}
            {report.createdAt ? format(new Date(report.createdAt), "dd MMMM yyyy, HH:mm", { locale: id }) : "—"}
          </div>
        </div>

        {statusCfg.next && (
          <Button
            onClick={() => handleStatusChange(statusCfg.next!)}
            disabled={saving}
            size="sm"
            className="rounded-xl text-xs font-semibold"
            style={{ backgroundColor: "rgba(240,180,41,0.15)", color: "#f0b429", border: "1px solid rgba(240,180,41,0.3)" }}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Tandai {STATUS_CONFIG[statusCfg.next]?.label}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 p-1 rounded-2xl w-fit"
        style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={
              activeTab === tab.key
                ? { backgroundColor: "#f0b429", color: "#071f0d" }
                : { color: "#a8d5b5" }
            }
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className="text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold"
                style={
                  activeTab === tab.key
                    ? { backgroundColor: "rgba(7,31,13,0.3)" }
                    : { backgroundColor: "rgba(240,180,41,0.2)", color: "#f0b429" }
                }
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* ─── INFO TAB ─────────────────────────────────────── */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: metadata */}
            <div className="rounded-2xl p-5 space-y-4" style={cardStyle}>
              <h3 className="font-semibold text-xs uppercase tracking-wider" style={{ color: "#f0b429" }}>Data Pelapor</h3>
              {[
                { icon: User,   label: "Nama",       value: report.nama },
                { icon: Phone,  label: "WhatsApp",   value: report.nomorWa },
                { icon: MapPin, label: "Kelurahan",  value: report.kelurahan },
                { icon: Home,   label: "RW",         value: `RW ${report.rw}` },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "rgba(240,180,41,0.12)" }}
                  >
                    <item.icon className="w-4 h-4" style={{ color: "#f0b429" }} />
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: "rgba(168,213,181,0.6)" }}>{item.label}</div>
                    <div className="text-sm font-semibold" style={{ color: "#c8e6d0" }}>{item.value}</div>
                  </div>
                </div>
              ))}

              {/* Kategori selector */}
              <div>
                <div className="text-xs mb-2" style={{ color: "rgba(168,213,181,0.6)" }}>Kategori Laporan</div>
                <Select value={kategoriId} onValueChange={(v) => handleKategoriChange(v ?? "")}>
                  <SelectTrigger className="h-9 rounded-xl text-sm" style={inputStyle}>
                    <SelectValue placeholder="Pilih kategori..." />
                  </SelectTrigger>
                  <SelectContent style={selectContentStyle}>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)} style={{ color: "#c8e6d0" }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.warna }} />
                          {cat.nama}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AI Suggestion */}
              {report.aiCategorySuggestion && (
                <div
                  className="rounded-xl p-3"
                  style={{ backgroundColor: "rgba(240,180,41,0.08)", border: "1px solid rgba(240,180,41,0.2)" }}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold mb-1" style={{ color: "#f0b429" }}>
                    <Brain className="w-3.5 h-3.5" />
                    Saran AI
                    {report.aiConfidenceScore && (
                      <span className="ml-auto" style={{ color: "rgba(240,180,41,0.7)" }}>
                        {Math.round(parseFloat(report.aiConfidenceScore) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: "#a8d5b5" }}>{report.aiAlasan}</div>
                </div>
              )}
            </div>

            {/* Right: isi laporan */}
            <div className="rounded-2xl p-5" style={cardStyle}>
              <h3 className="font-semibold text-xs uppercase tracking-wider mb-4" style={{ color: "#f0b429" }}>Isi Laporan</h3>
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap rounded-xl p-4 min-h-[200px]"
                style={{ backgroundColor: "#145228", color: "#c8e6d0" }}
              >
                {report.isiLaporan}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "rgba(168,213,181,0.5)" }}>
                <Clock className="w-3.5 h-3.5" />
                Diterima{" "}
                {report.createdAt
                  ? format(new Date(report.createdAt), "dd MMMM yyyy 'pukul' HH:mm", { locale: id })
                  : "—"}
              </div>
            </div>
          </div>
        )}

        {/* ─── DISPOSISI TAB ────────────────────────────────── */}
        {activeTab === "disposisi" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold" style={{ color: "#f5c518" }}>Tambah Disposisi</h3>
                <Button
                  size="sm"
                  onClick={() => setDisposisiOpen(!disposisiOpen)}
                  className="rounded-xl text-xs font-semibold"
                  style={{ backgroundColor: "rgba(240,180,41,0.12)", color: "#f0b429", border: "1px solid rgba(240,180,41,0.25)" }}
                >
                  {disposisiOpen ? "Tutup" : "Disposisikan ke Bidang"}
                  <ChevronDown className={`w-3.5 h-3.5 ml-1.5 transition-transform ${disposisiOpen ? "rotate-180" : ""}`} />
                </Button>
              </div>

              {disposisiOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-3"
                >
                  <Select value={selBidang} onValueChange={(v) => setSelBidang(v ?? "")}>
                    <SelectTrigger className="h-10 rounded-xl" style={inputStyle}>
                      <SelectValue placeholder="Pilih bidang..." />
                    </SelectTrigger>
                    <SelectContent style={selectContentStyle}>
                      {allBidang.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)} style={{ color: "#c8e6d0" }}>
                          <div>
                            <div className="font-medium">{b.nama}</div>
                            <div className="text-xs" style={{ color: "#a8d5b5" }}>{b.deskripsi}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Catatan disposisi (opsional)..."
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="rounded-xl min-h-[80px] resize-none text-sm placeholder:opacity-40"
                    style={inputStyle}
                  />
                  <Button
                    onClick={handleDisposisi}
                    disabled={saving || !selBidang}
                    className="font-semibold rounded-xl"
                    style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
                  >
                    Simpan Disposisi
                  </Button>
                </motion.div>
              )}
            </div>

            {disposisiList.length === 0 ? (
              <div className="rounded-2xl py-12 text-center text-sm" style={{ ...cardStyle, color: "#a8d5b5" }}>
                Belum ada disposisi
              </div>
            ) : (
              <div className="space-y-3">
                {disposisiList.map((d, i) => (
                  <div key={d.id} className="rounded-2xl p-4" style={cardStyle}>
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: "rgba(240,180,41,0.15)" }}
                      >
                        <Building2 className="w-4 h-4" style={{ color: "#f0b429" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm" style={{ color: "#c8e6d0" }}>{d.bidangNama}</span>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: "#f0b429", backgroundColor: "rgba(240,180,41,0.12)" }}
                          >
                            {d.bidangKode}
                          </span>
                          {i === 0 && (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ color: "#4ade80", backgroundColor: "rgba(74,222,128,0.12)" }}
                            >
                              Terbaru
                            </span>
                          )}
                        </div>
                        {d.catatan && <p className="text-xs mb-1" style={{ color: "#a8d5b5" }}>{d.catatan}</p>}
                        <div className="text-xs" style={{ color: "rgba(168,213,181,0.5)" }}>
                          {d.disposedAt ? format(new Date(d.disposedAt), "dd MMM yyyy, HH:mm", { locale: id }) : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── WA CHAT TAB ──────────────────────────────────── */}
        {activeTab === "wa" && (
          <div className="space-y-4">
            {/* Chat messages */}
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <div
                className="px-4 py-3 border-b flex items-center gap-2"
                style={{ borderColor: "rgba(240,180,41,0.12)" }}
              >
                <MessageSquare className="w-4 h-4" style={{ color: "#4ade80" }} />
                <span className="text-sm font-semibold" style={{ color: "#f5c518" }}>
                  Chat WA — {report.nomorWa}
                </span>
              </div>
              <div className="h-72 overflow-y-auto p-4 space-y-3">
                {waLogs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm" style={{ color: "#a8d5b5" }}>
                    Belum ada riwayat pesan
                  </div>
                ) : (
                  waLogs.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                      <div
                        className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                        style={
                          msg.direction === "outbound"
                            ? { backgroundColor: "#f0b429", color: "#071f0d", borderRadius: "18px 4px 18px 18px" }
                            : { backgroundColor: "#145228", color: "#c8e6d0", borderRadius: "4px 18px 18px 18px" }
                        }
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <div
                          className="text-[10px] mt-1"
                          style={{ color: msg.direction === "outbound" ? "rgba(7,31,13,0.6)" : "rgba(168,213,181,0.5)" }}
                        >
                          {msg.timestamp ? format(new Date(msg.timestamp), "HH:mm") : "—"}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* AI Templates */}
            {aiOpen && (
              <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: "rgba(240,180,41,0.07)", border: "1px solid rgba(240,180,41,0.2)" }}
              >
                <div className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: "#f0b429" }}>
                  <Brain className="w-4 h-4" />
                  Template Balasan AI
                </div>
                {aiLoading ? (
                  <div className="text-center py-6 text-sm" style={{ color: "#a8d5b5" }}>
                    <span className="flex items-center justify-center gap-2">
                      <span
                        className="w-4 h-4 border-2 rounded-full animate-spin"
                        style={{ borderColor: "rgba(240,180,41,0.3)", borderTopColor: "#f0b429" }}
                      />
                      Membuat template...
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {aiTemplates.map((tpl, i) => (
                      <div
                        key={i}
                        className="rounded-xl p-3"
                        style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
                      >
                        <div className="text-xs mb-2" style={{ color: "rgba(168,213,181,0.6)" }}>
                          {["Singkat", "Menengah", "Formal"][i] ?? `Template ${i + 1}`}
                        </div>
                        <p className="text-xs leading-relaxed mb-3 whitespace-pre-wrap" style={{ color: "#c8e6d0" }}>{tpl}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => applyTemplate(tpl)}
                            className="h-7 text-xs rounded-lg font-semibold"
                            style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
                          >
                            Gunakan
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => { navigator.clipboard.writeText(tpl); toast.success("Disalin!"); }}
                            className="h-7 text-xs rounded-lg"
                            style={{ backgroundColor: "rgba(240,180,41,0.1)", color: "#a8d5b5", border: "1px solid rgba(240,180,41,0.2)" }}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Salin
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message input */}
            <div className="rounded-2xl p-4" style={cardStyle}>
              <Textarea
                placeholder="Ketik pesan WhatsApp..."
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                className="rounded-xl min-h-[80px] resize-none mb-3 text-sm placeholder:opacity-40"
                style={inputStyle}
              />
              <div className="flex gap-2">
                <Button
                  onClick={generateAiReply}
                  disabled={aiLoading}
                  className="rounded-xl text-xs gap-1.5 font-semibold"
                  style={{ backgroundColor: "rgba(240,180,41,0.12)", color: "#f0b429", border: "1px solid rgba(240,180,41,0.25)" }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate AI
                </Button>
                <Button
                  onClick={handleSendWa}
                  disabled={sendingWa || !waMessage.trim()}
                  className="ml-auto rounded-xl text-xs gap-1.5 font-bold"
                  style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingWa ? "Mengirim..." : "Kirim WA"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
