"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  ArrowLeft, Globe, MessageSquare, Laptop, MapPin, Clock,
  ChevronDown, FileText, User, Phone, Home, Building2,
  CheckCircle2,
  Paperclip,
  History,
  Download,
  ClipboardCheck,
  Siren,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPriorityConfig, getSlaState } from "@/lib/report-sla";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; next: string | null }> = {
  masuk:     { label: "Masuk",     color: "#f5c518", bg: "rgba(245,197,24,0.15)",    next: "diproses" },
  diproses:  { label: "Diproses",  color: "#f0b429", bg: "rgba(240,180,41,0.15)",    next: "selesai" },
  disposisi: { label: "Disposisi", color: "#86efac", bg: "rgba(134,239,172,0.12)",   next: "selesai" },
  menunggu_data_tambahan: { label: "Menunggu Data Tambahan", color: "#f97316", bg: "rgba(249,115,22,0.12)", next: "diproses" },
  selesai:   { label: "Selesai",   color: "#4ade80", bg: "rgba(74,222,128,0.12)",    next: null },
};

type Report = {
  id: number; nomorLaporan: string; nama: string; nomorWa: string;
  kelurahan: string; rw: string; isiLaporan: string; status: string;
  source: string; priorityLevel: string; priorityReason: string | null; outcomeType: string | null; outcomeSummary: string | null; outcomeFollowUp: string | null;
  additionalInfoRequest: string | null; additionalInfoRequestedAt: Date | null;
  createdAt: Date | null; updatedAt: Date | null;
  kategoriId: number | null; kategoriNama: string | null;
  kategoriWarna: string | null; kategoriKode: string | null; kategoriIcon: string | null;
};

type DisposisiItem = {
  id: number; catatan: string | null; disposedAt: Date | null;
  bidangId: number; bidangNama: string | null; bidangKode: string | null;
};

type Attachment = {
  id: number;
  originalName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date | null;
};

type AuditLog = {
  id: number;
  action: string;
  actorType: string;
  actorId: string | null;
  actorName: string | null;
  summary: string;
  metadata: string | null;
  createdAt: Date | null;
};

type Bidang = { id: number; nama: string; kode: string; deskripsi: string | null };
type Category = { id: number; nama: string; kode: string; warna: string; icon: string };

interface Props {
  report: Report;
  disposisiList: DisposisiItem[];
  allBidang: Bidang[];
  allCategories: Category[];
  attachments: Attachment[];
  auditLogs: AuditLog[];
}

const cardStyle = { backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" };
const inputStyle = { backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" };
const selectContentStyle = { backgroundColor: "#0a3d1a", borderColor: "rgba(240,180,41,0.2)" };
const OUTCOME_OPTIONS = [
  { value: "ditindaklanjuti", label: "Sudah Ditindaklanjuti" },
  { value: "diteruskan", label: "Diteruskan ke Instansi/Layanan Lain" },
  { value: "bukan_kewenangan", label: "Bukan Kewenangan Kejari" },
  { value: "butuh_data_tambahan", label: "Butuh Data Tambahan" },
  { value: "selesai_konsultasi", label: "Konsultasi Selesai" },
];
const PRIORITY_OPTIONS = [
  { value: "rendah", label: "Rendah" },
  { value: "normal", label: "Normal" },
  { value: "penting", label: "Penting" },
  { value: "mendesak", label: "Mendesak" },
  { value: "kritis", label: "Kritis" },
];

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function LaporanDetailClient({ report, disposisiList, allBidang, allCategories, attachments, auditLogs }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"info" | "disposisi" | "audit">("info");
  const [status, setStatus] = useState(report.status);
  const [kategoriId, setKategoriId] = useState<string>(report.kategoriId?.toString() ?? "");
  const [disposisiOpen, setDisposisiOpen] = useState(false);
  const [selBidang, setSelBidang] = useState("");
  const [catatan, setCatatan] = useState("");
  const [priorityLevel, setPriorityLevel] = useState(report.priorityLevel ?? "normal");
  const [priorityReason, setPriorityReason] = useState(report.priorityReason ?? "");
  const [outcomeType, setOutcomeType] = useState(report.outcomeType ?? "");
  const [outcomeSummary, setOutcomeSummary] = useState(report.outcomeSummary ?? "");
  const [outcomeFollowUp, setOutcomeFollowUp] = useState(report.outcomeFollowUp ?? "");
  const [additionalInfoMessage, setAdditionalInfoMessage] = useState(report.additionalInfoRequest ?? "");
  const [saving, setSaving] = useState(false);

  const SourceIcon = report.source === "wa" ? MessageSquare : report.source === "offline" ? Laptop : Globe;
  const sourceColor = report.source === "wa" ? "#4ade80" : report.source === "offline" ? "#a8d5b5" : "#f0b429";
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.masuk;
  const priorityConfig = getPriorityConfig(priorityLevel);
  const slaState = getSlaState({ status, createdAt: report.createdAt, updatedAt: report.updatedAt });

  const patchReport = async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/reports/${report.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Gagal menyimpan");
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === "selesai") {
      if (!outcomeType) {
        toast.error("Pilih hasil penanganan terlebih dahulu");
        return;
      }

      if (outcomeSummary.trim().length < 20) {
        toast.error("Ringkasan hasil penanganan minimal 20 karakter");
        return;
      }
    }

    setSaving(true);
    try {
      await patchReport({
        status: newStatus,
        ...(newStatus === "selesai"
          ? {
              outcome: {
                type: outcomeType,
                summary: outcomeSummary,
                followUp: outcomeFollowUp,
              },
            }
          : {}),
      });
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

  const handlePrioritySave = async () => {
    setSaving(true);
    try {
      await patchReport({ priority: { level: priorityLevel, reason: priorityReason } });
      toast.success("Prioritas laporan diperbarui");
      router.refresh();
    } catch {
      toast.error("Gagal memperbarui prioritas");
    } finally {
      setSaving(false);
    }
  };

  const handleDisposisi = async () => {
    if (!selBidang) return toast.error("Pilih seksi");
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

  const handleRequestMoreInfo = async () => {
    if (additionalInfoMessage.trim().length < 15) {
      toast.error("Permintaan data tambahan minimal 15 karakter");
      return;
    }

    setSaving(true);
    try {
      await patchReport({ requestMoreInfo: { message: additionalInfoMessage } });
      setStatus("menunggu_data_tambahan");
      toast.success("Permintaan data tambahan dikirim ke pelapor");
      router.refresh();
    } catch {
      toast.error("Gagal mengirim permintaan data tambahan");
    } finally {
      setSaving(false);
    }
  };

  const TABS: Array<{ key: "info" | "disposisi" | "audit"; label: string; icon: React.ElementType; badge?: number }> = [
    { key: "info", label: "Info Laporan", icon: FileText },
    { key: "disposisi", label: "Disposisi", icon: Building2, badge: disposisiList.length },
    { key: "audit", label: "Audit Trail", icon: History, badge: auditLogs.length },
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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: priorityConfig.color, backgroundColor: priorityConfig.bg }}>
              Prioritas {priorityConfig.label}
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: slaState.color, backgroundColor: slaState.bg }}>
              {slaState.label}
            </span>
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

              <div className="space-y-3 rounded-xl p-4" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.12)" }}>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#f0b429" }}>
                  <Siren className="w-3.5 h-3.5" />
                  Prioritas & SLA
                </div>
                <div className="space-y-2">
                  <div className="text-xs" style={{ color: "rgba(168,213,181,0.6)" }}>Level prioritas</div>
                  <Select value={priorityLevel} onValueChange={(v) => setPriorityLevel(v ?? "normal")}>
                    <SelectTrigger className="h-10 rounded-xl text-sm" style={inputStyle}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={selectContentStyle}>
                      {PRIORITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} style={{ color: "#c8e6d0" }}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  placeholder="Alasan prioritas, misalnya ada potensi ancaman, korban rentan, atau tenggat cepat."
                  className="rounded-xl min-h-[84px] resize-none text-sm placeholder:opacity-40"
                  style={inputStyle}
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs" style={{ color: "#a8d5b5" }}>
                    SLA saat ini: <span style={{ color: slaState.color }}>{slaState.label}</span>
                  </div>
                  <Button onClick={handlePrioritySave} disabled={saving} className="rounded-xl text-xs" style={{ backgroundColor: "#f0b429", color: "#071f0d" }}>
                    Simpan Prioritas
                  </Button>
                </div>
              </div>
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

              <div className="mt-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#f0b429" }}>
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Hasil Penanganan
                </div>
                <div className="space-y-3 rounded-xl p-4" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.12)" }}>
                  <div className="space-y-2">
                    <div className="text-xs" style={{ color: "rgba(168,213,181,0.6)" }}>Jenis hasil</div>
                    <Select value={outcomeType} onValueChange={(v) => setOutcomeType(v ?? "")}>
                      <SelectTrigger className="h-10 rounded-xl text-sm" style={inputStyle}>
                        <SelectValue placeholder="Pilih hasil penanganan..." />
                      </SelectTrigger>
                      <SelectContent style={selectContentStyle}>
                        {OUTCOME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value} style={{ color: "#c8e6d0" }}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs" style={{ color: "rgba(168,213,181,0.6)" }}>Ringkasan hasil</div>
                    <Textarea
                      value={outcomeSummary}
                      onChange={(e) => setOutcomeSummary(e.target.value)}
                      placeholder="Contoh: Laporan telah diverifikasi dan diteruskan ke seksi terkait untuk tindak lanjut lapangan."
                      className="rounded-xl min-h-[96px] resize-none text-sm placeholder:opacity-40"
                      style={inputStyle}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs" style={{ color: "rgba(168,213,181,0.6)" }}>Catatan tindak lanjut lanjutan</div>
                    <Textarea
                      value={outcomeFollowUp}
                      onChange={(e) => setOutcomeFollowUp(e.target.value)}
                      placeholder="Opsional. Contoh: menunggu dokumen tambahan dari pelapor atau diarahkan ke instansi lain."
                      className="rounded-xl min-h-[84px] resize-none text-sm placeholder:opacity-40"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#f0b429" }}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  Permintaan Data Tambahan
                </div>
                <div className="space-y-3 rounded-xl p-4" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.12)" }}>
                  <Textarea
                    value={additionalInfoMessage}
                    onChange={(e) => setAdditionalInfoMessage(e.target.value)}
                    placeholder="Contoh: Mohon kirim foto bukti transaksi, kronologi waktu kejadian, atau identitas pihak yang dilaporkan."
                    className="rounded-xl min-h-[96px] resize-none text-sm placeholder:opacity-40"
                    style={inputStyle}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs" style={{ color: "#a8d5b5" }}>
                      {report.additionalInfoRequestedAt
                        ? `Terakhir diminta ${format(new Date(report.additionalInfoRequestedAt), "dd MMM yyyy, HH:mm", { locale: id })}`
                        : "Belum pernah meminta data tambahan"}
                    </div>
                    <Button
                      onClick={handleRequestMoreInfo}
                      disabled={saving || report.nomorWa.trim() === ""}
                      className="rounded-xl text-xs"
                      style={{ backgroundColor: "rgba(249,115,22,0.18)", color: "#fdba74", border: "1px solid rgba(249,115,22,0.24)" }}
                    >
                      Kirim Permintaan
                    </Button>
                  </div>
                  {report.nomorWa.trim() === "" && (
                    <div className="text-xs" style={{ color: "#fca5a5" }}>
                      Laporan anonim atau tanpa nomor WhatsApp tidak bisa dimintai data tambahan lewat sistem.
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#f0b429" }}>
                  <Paperclip className="w-3.5 h-3.5" />
                  Lampiran Bukti
                </div>
                {attachments.length === 0 ? (
                  <div className="rounded-xl px-4 py-4 text-sm" style={{ backgroundColor: "#145228", color: "#a8d5b5" }}>
                    Belum ada lampiran bukti pada laporan ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.filePath}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-[rgba(240,180,41,0.05)]"
                        style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.12)" }}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold" style={{ color: "#c8e6d0" }}>{attachment.originalName}</div>
                          <div className="text-xs" style={{ color: "rgba(168,213,181,0.6)" }}>
                            {attachment.mimeType} · {formatBytes(attachment.sizeBytes)}
                          </div>
                        </div>
                        <Download className="w-4 h-4 flex-shrink-0" style={{ color: "#f0b429" }} />
                      </a>
                    ))}
                  </div>
                )}
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
                  {disposisiOpen ? "Tutup" : "Disposisikan ke Seksi"}
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
                      <SelectValue placeholder="Pilih seksi..." />
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

        {activeTab === "audit" && (
          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <div className="rounded-2xl py-12 text-center text-sm" style={{ ...cardStyle, color: "#a8d5b5" }}>
                Belum ada audit trail
              </div>
            ) : (
              auditLogs.map((log, index) => (
                <div key={log.id} className="rounded-2xl p-4" style={cardStyle}>
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "rgba(240,180,41,0.15)" }}
                    >
                      <History className="w-4 h-4" style={{ color: "#f0b429" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold" style={{ color: "#c8e6d0" }}>{log.summary}</div>
                        {index === 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: "#4ade80", backgroundColor: "rgba(74,222,128,0.12)" }}>
                            Terbaru
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: "#a8d5b5" }}>
                        {log.actorName ?? "Sistem"} · {log.actorType}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: "rgba(168,213,181,0.5)" }}>
                        {log.createdAt ? format(new Date(log.createdAt), "dd MMM yyyy, HH:mm", { locale: id }) : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
