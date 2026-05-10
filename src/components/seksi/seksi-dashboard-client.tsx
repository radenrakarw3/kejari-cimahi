"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  SendHorizonal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPriorityConfig, getSlaState } from "@/lib/report-sla";

type SeksiReport = {
  id: number;
  nomorLaporan: string;
  nama: string;
  nomorWa: string;
  kelurahan: string;
  rw: string;
  isiLaporan: string;
  status: string;
  priorityLevel: string;
  priorityReason: string | null;
  outcomeType: string | null;
  outcomeSummary: string | null;
  outcomeFollowUp: string | null;
  additionalInfoRequest: string | null;
  additionalInfoRequestedAt: Date | null;
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
  menunggu_data_tambahan: { label: "Menunggu Data", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  selesai: { label: "Selesai", color: "#4ade80", bg: "rgba(74,222,128,0.12)" },
};

interface SeksiDashboardClientProps {
  bidangNama: string | null;
  reports: SeksiReport[];
}

type Appointment = {
  id: number;
  hostName: string;
  visitorName: string;
  visitorPhone: string | null;
  agenda: string;
  note: string | null;
  scheduledFor: string;
  isIncognito: boolean;
  status: string;
  confirmedAt: string | null;
  bidangNama: string;
};

function normalizePhone(phone: string) {
  const clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) return `62${clean.slice(1)}`;
  if (!clean.startsWith("62")) return `62${clean}`;
  return clean;
}

export function SeksiDashboardClient({ bidangNama, reports }: SeksiDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeSection, setActiveSection] = useState<"laporan" | "janji-temu">("laporan");
  const [activeFilter, setActiveFilter] = useState<"aktif" | "selesai">("aktif");
  const [finishingReportId, setFinishingReportId] = useState<number | null>(null);
  const [outcomeType, setOutcomeType] = useState("");
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [outcomeFollowUp, setOutcomeFollowUp] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "kritis" | "mendesak" | "penting" | "normal" | "rendah">("all");
  const [attentionFilter, setAttentionFilter] = useState<"all" | "sla" | "data">("all");
  const [appointmentForm, setAppointmentForm] = useState({
    hostName: "",
    visitorName: "",
    visitorPhone: "",
    agenda: "",
    note: "",
    scheduledFor: "",
    isIncognito: false,
  });

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const res = await fetch("/api/bidang/appointments", { cache: "no-store" });
        if (!res.ok) throw new Error("Gagal memuat janji temu hari ini");
        const data = (await res.json()) as { data?: Appointment[] };
        setAppointments(data.data ?? []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal memuat janji temu");
      } finally {
        setAppointmentsLoading(false);
      }
    };

    void loadAppointments();
  }, []);

  const filteredReports = useMemo(() => {
    return reports
      .filter((report) =>
        activeFilter === "aktif" ? report.status !== "selesai" : report.status === "selesai"
      )
      .filter((report) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          report.nomorLaporan.toLowerCase().includes(q) ||
          report.nama.toLowerCase().includes(q) ||
          report.kelurahan.toLowerCase().includes(q) ||
          report.rw.toLowerCase().includes(q)
        );
      })
      .filter((report) => (priorityFilter === "all" ? true : report.priorityLevel === priorityFilter))
      .filter((report) => {
        if (attentionFilter === "all") return true;
        if (attentionFilter === "data") return report.status === "menunggu_data_tambahan";
        return getSlaState({
          status: report.status,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
        }).key === "danger";
      });
  }, [activeFilter, attentionFilter, priorityFilter, reports, searchTerm]);

  const quickStats = useMemo(() => {
    return {
      butuhData: reports.filter((report) => report.status === "menunggu_data_tambahan").length,
      kritis: reports.filter((report) => ["kritis", "mendesak"].includes(report.priorityLevel)).length,
      lewatSla: reports.filter((report) => {
        return (
          getSlaState({
            status: report.status,
            createdAt: report.createdAt,
            updatedAt: report.updatedAt,
          }).key === "danger"
        );
      }).length,
    };
  }, [reports]);

  const sectionCounts = useMemo(
    () => ({
      laporan: reports.filter((report) => report.status !== "selesai").length,
      janjiTemu: appointments.length,
    }),
    [appointments.length, reports]
  );

  const updateStatus = (reportId: number, status: "diproses" | "selesai") => {
    startTransition(async () => {
      try {
        if (status === "selesai") {
          if (!outcomeType) throw new Error("Pilih hasil penanganan terlebih dahulu");
          if (outcomeSummary.trim().length < 20) throw new Error("Ringkasan hasil minimal 20 karakter");
        }

        const res = await fetch(`/api/reports/${reportId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            ...(status === "selesai"
              ? {
                  outcome: {
                    type: outcomeType,
                    summary: outcomeSummary,
                    followUp: outcomeFollowUp,
                  },
                }
              : {}),
          }),
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
        if (status === "selesai") {
          setFinishingReportId(null);
          setOutcomeType("");
          setOutcomeSummary("");
          setOutcomeFollowUp("");
        }
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
      }
    });
  };

  const submitAppointment = () => {
    setSavingAppointment(true);
    startTransition(async () => {
      try {
        if (
          !appointmentForm.hostName.trim() ||
          !appointmentForm.visitorName.trim() ||
          !appointmentForm.agenda.trim() ||
          !appointmentForm.scheduledFor
        ) {
          throw new Error("Lengkapi host, nama tamu, agenda, dan waktu janji temu");
        }

        const res = await fetch("/api/bidang/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(appointmentForm),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Gagal menyimpan janji temu");
        }

        const reload = await fetch("/api/bidang/appointments", { cache: "no-store" });
        const reloadData = (await reload.json().catch(() => ({ data: [] }))) as { data?: Appointment[] };
        setAppointments(reloadData.data ?? []);
        setAppointmentForm({
          hostName: "",
          visitorName: "",
          visitorPhone: "",
          agenda: "",
          note: "",
          scheduledFor: "",
          isIncognito: false,
        });
        toast.success("Janji temu hari ini berhasil ditambahkan");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menambah janji temu");
      } finally {
        setSavingAppointment(false);
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            label: "Butuh Data Tambahan",
            value: quickStats.butuhData,
            helper: "Menunggu respons pelapor",
            color: "#fb923c",
            bg: "rgba(249,115,22,0.10)",
          },
          {
            label: "Prioritas Tinggi",
            value: quickStats.kritis,
            helper: "Kritis dan mendesak",
            color: "#f87171",
            bg: "rgba(248,113,113,0.10)",
          },
          {
            label: "Lewat SLA",
            value: quickStats.lewatSla,
            helper: "Perlu perhatian cepat",
            color: "#f5c518",
            bg: "rgba(245,197,24,0.10)",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl px-4 py-4"
            style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: item.color }}>
              {item.label}
            </div>
            <div className="mt-2 text-2xl font-bold" style={{ color: "#f5c518" }}>{item.value}</div>
            <div className="mt-1 text-xs" style={{ color: "#a8d5b5" }}>{item.helper}</div>
          </div>
        ))}
      </div>

      <div
        className="rounded-[24px] p-2 flex flex-wrap gap-2"
        style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
      >
        {[
          { key: "laporan", label: "Laporan Masuk", count: sectionCounts.laporan },
          { key: "janji-temu", label: "Janji Temu", count: sectionCounts.janjiTemu },
        ].map((item) => {
          const isActive = activeSection === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key as "laporan" | "janji-temu")}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              style={
                isActive
                  ? { backgroundColor: "#f0b429", color: "#071f0d" }
                  : { backgroundColor: "rgba(240,180,41,0.08)", color: "#a8d5b5" }
              }
            >
              <span>{item.label}</span>
              <span
                className="min-w-5 h-5 px-1.5 rounded-full text-[11px] inline-flex items-center justify-center"
                style={
                  isActive
                    ? { backgroundColor: "rgba(7,31,13,0.18)", color: "#071f0d" }
                    : { backgroundColor: "rgba(240,180,41,0.16)", color: "#f0b429" }
                }
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {activeSection === "laporan" ? (
        <>
          <div
            className="rounded-[24px] p-4 space-y-4"
            style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
          >
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

            <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8d5b5" }} />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nomor laporan, nama, kelurahan, atau RW..."
                  className="h-11 rounded-xl pl-9 text-sm"
                  style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0" }}
                />
              </div>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
                className="h-11 rounded-xl border px-3 text-sm"
                style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0" }}
              >
                <option value="all">Semua Prioritas</option>
                <option value="kritis">Kritis</option>
                <option value="mendesak">Mendesak</option>
                <option value="penting">Penting</option>
                <option value="normal">Normal</option>
                <option value="rendah">Rendah</option>
              </select>

              <select
                value={attentionFilter}
                onChange={(e) => setAttentionFilter(e.target.value as typeof attentionFilter)}
                className="h-11 rounded-xl border px-3 text-sm"
                style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0" }}
              >
                <option value="all">Semua Atensi</option>
                <option value="sla">Lewat SLA</option>
                <option value="data">Menunggu Data</option>
              </select>
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div
              className="rounded-3xl px-6 py-16 text-center"
              style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
            >
              <div className="text-lg font-semibold" style={{ color: "#f5c518" }}>
                Belum ada laporan pada filter ini
              </div>
              <p className="text-sm mt-2" style={{ color: "#a8d5b5" }}>
                Coba ubah pencarian atau filter prioritas untuk melihat laporan lain di seksi {bidangNama ?? "ini"}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredReports.map((report) => {
                const statusConfig = STATUS_CONFIG[report.status] ?? STATUS_CONFIG.disposisi;
                const priorityConfig = getPriorityConfig(report.priorityLevel);
                const slaState = getSlaState({ status: report.status, createdAt: report.createdAt, updatedAt: report.updatedAt });
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
                        {report.nomorWa || "Tanpa nomor WA"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: priorityConfig.color, backgroundColor: priorityConfig.bg }}>
                        Prioritas {priorityConfig.label}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: slaState.color, backgroundColor: slaState.bg }}>
                        {slaState.label}
                      </span>
                      {slaState.key === "danger" && (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: "#fca5a5", backgroundColor: "rgba(248,113,113,0.12)" }}>
                          Lewat SLA
                        </span>
                      )}
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

                {report.status === "menunggu_data_tambahan" && report.additionalInfoRequest && (
                  <div
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.18)" }}
                  >
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: "#fdba74" }}>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Data Tambahan Diminta
                    </div>
                    <p className="text-sm leading-6 whitespace-pre-wrap" style={{ color: "#fef3c7" }}>
                      {report.additionalInfoRequest}
                    </p>
                    {report.additionalInfoRequestedAt && (
                      <div className="mt-2 text-xs" style={{ color: "rgba(254,243,199,0.72)" }}>
                        Diminta {format(new Date(report.additionalInfoRequestedAt), "dd MMM yyyy, HH:mm", { locale: id })}
                      </div>
                    )}
                  </div>
                )}

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

                {(report.status === "selesai" || finishingReportId === report.id) && (
                  <div
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.16)" }}
                  >
                    <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-2" style={{ color: "#86efac" }}>
                      Hasil Penanganan
                    </div>
                    {report.status === "selesai" && finishingReportId !== report.id ? (
                      <div className="space-y-2 text-sm" style={{ color: "#c8e6d0" }}>
                        <div>{report.outcomeType ?? "-"}</div>
                        <p className="whitespace-pre-wrap">{report.outcomeSummary ?? "-"}</p>
                        {report.outcomeFollowUp && (
                          <p className="whitespace-pre-wrap" style={{ color: "#a8d5b5" }}>{report.outcomeFollowUp}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <select
                          value={outcomeType}
                          onChange={(e) => setOutcomeType(e.target.value)}
                          className="h-10 w-full rounded-xl border px-3 text-sm"
                          style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0" }}
                        >
                          <option value="">Pilih hasil penanganan...</option>
                          <option value="ditindaklanjuti">Sudah Ditindaklanjuti</option>
                          <option value="diteruskan">Diteruskan ke Instansi/Layanan Lain</option>
                          <option value="bukan_kewenangan">Bukan Kewenangan Kejari</option>
                          <option value="butuh_data_tambahan">Butuh Data Tambahan</option>
                          <option value="selesai_konsultasi">Konsultasi Selesai</option>
                        </select>
                        <textarea
                          value={outcomeSummary}
                          onChange={(e) => setOutcomeSummary(e.target.value)}
                          placeholder="Ringkasan hasil penanganan..."
                          className="min-h-[96px] w-full rounded-xl border px-3 py-2 text-sm"
                          style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0" }}
                        />
                        <textarea
                          value={outcomeFollowUp}
                          onChange={(e) => setOutcomeFollowUp(e.target.value)}
                          placeholder="Catatan tindak lanjut lanjutan (opsional)..."
                          className="min-h-[84px] w-full rounded-xl border px-3 py-2 text-sm"
                          style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0" }}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs" style={{ color: "rgba(168,213,181,0.75)" }}>
                    Diterima {report.createdAt ? format(new Date(report.createdAt), "dd MMMM yyyy, HH:mm", { locale: id }) : "-"}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {report.nomorWa?.trim() ? (
                      <a
                        href={`https://wa.me/${normalizePhone(report.nomorWa)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button
                          type="button"
                          className="rounded-xl"
                          style={{
                            backgroundColor: "rgba(134,239,172,0.14)",
                            color: "#86efac",
                            border: "1px solid rgba(134,239,172,0.24)",
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-1.5" />
                          Hubungi WA
                        </Button>
                      </a>
                    ) : null}

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
                      <>
                        {finishingReportId === report.id ? (
                          <Button
                            onClick={() => updateStatus(report.id, "selesai")}
                            disabled={isUpdating}
                            className="rounded-xl"
                            style={{ backgroundColor: "rgba(74,222,128,0.14)", color: "#86efac", border: "1px solid rgba(74,222,128,0.25)" }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Simpan Hasil & Selesai
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              setFinishingReportId(report.id);
                              setOutcomeType(report.outcomeType ?? "");
                              setOutcomeSummary(report.outcomeSummary ?? "");
                              setOutcomeFollowUp(report.outcomeFollowUp ?? "");
                            }}
                            disabled={isUpdating}
                            className="rounded-xl"
                            style={{ backgroundColor: "rgba(74,222,128,0.14)", color: "#86efac", border: "1px solid rgba(74,222,128,0.25)" }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Isi Hasil Penanganan
                          </Button>
                        )}
                      </>
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
        </>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5" style={{ color: "#f0b429" }} />
            <div>
              <div className="text-lg font-bold" style={{ color: "#f5c518" }}>Janji Temu</div>
              <div className="text-sm" style={{ color: "#a8d5b5" }}>
                Area khusus agenda tamu agar tidak menumpuk dengan disposisi masuk.
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div
            className="rounded-[28px] p-5 space-y-4"
            style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
          >
            <div>
              <div className="text-lg font-bold" style={{ color: "#f5c518" }}>Input Janji Temu Hari Ini</div>
              <div className="text-sm" style={{ color: "#a8d5b5" }}>
                Input agenda tamu agar PTSP bisa langsung mencocokkan saat tamu datang.
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={appointmentForm.hostName}
                onChange={(e) => setAppointmentForm((prev) => ({ ...prev, hostName: e.target.value }))}
                placeholder="Nama host / jaksa / petugas"
                className="h-11 rounded-xl border px-3 text-sm"
                style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0" }}
              />
              <input
                value={appointmentForm.visitorName}
                onChange={(e) => setAppointmentForm((prev) => ({ ...prev, visitorName: e.target.value }))}
                placeholder="Nama tamu"
                className="h-11 rounded-xl border px-3 text-sm"
                style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0" }}
              />
              <input
                value={appointmentForm.visitorPhone}
                onChange={(e) => setAppointmentForm((prev) => ({ ...prev, visitorPhone: e.target.value }))}
                placeholder="Nomor WA tamu (opsional)"
                className="h-11 rounded-xl border px-3 text-sm"
                style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0" }}
              />
              <input
                type="datetime-local"
                value={appointmentForm.scheduledFor}
                onChange={(e) => setAppointmentForm((prev) => ({ ...prev, scheduledFor: e.target.value }))}
                className="h-11 rounded-xl border px-3 text-sm"
                style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0" }}
              />
            </div>

            <textarea
              value={appointmentForm.agenda}
              onChange={(e) => setAppointmentForm((prev) => ({ ...prev, agenda: e.target.value }))}
              placeholder="Agenda / keperluan janji temu"
              className="min-h-[90px] w-full rounded-xl border px-3 py-2 text-sm"
              style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0" }}
            />
            <textarea
              value={appointmentForm.note}
              onChange={(e) => setAppointmentForm((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Catatan tambahan untuk PTSP (opsional)"
              className="min-h-[82px] w-full rounded-xl border px-3 py-2 text-sm"
              style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0" }}
            />

            <label className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: "rgba(240,180,41,0.08)", border: "1px solid rgba(240,180,41,0.16)" }}>
              <input
                type="checkbox"
                checked={appointmentForm.isIncognito}
                onChange={(e) => setAppointmentForm((prev) => ({ ...prev, isIncognito: e.target.checked }))}
              />
              <span className="text-sm" style={{ color: "#c8e6d0" }}>
                Tamu ini ingin dicatat sebagai incognito di meja PTSP.
              </span>
            </label>

            <Button
              onClick={submitAppointment}
              disabled={savingAppointment || isPending}
              className="rounded-xl"
              style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
            >
              Simpan Janji Temu
            </Button>
          </div>

          <div
            className="rounded-[28px] p-5"
            style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
          >
            <div className="text-lg font-bold" style={{ color: "#f5c518" }}>Daftar Janji Hari Ini</div>
            <div className="text-sm mt-1" style={{ color: "#a8d5b5" }}>
              PTSP akan melihat daftar ini dan menandai tamu sebagai datang.
            </div>

            <div className="mt-4 space-y-3">
              {appointmentsLoading ? (
                <div className="text-sm" style={{ color: "#a8d5b5" }}>Memuat janji temu...</div>
              ) : appointments.length === 0 ? (
                <div className="text-sm" style={{ color: "#a8d5b5" }}>Belum ada janji temu untuk hari ini.</div>
              ) : (
                appointments.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.14)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold" style={{ color: "#f5c518" }}>{item.hostName}</div>
                        <div className="text-xs mt-1" style={{ color: "#a8d5b5" }}>
                          {format(new Date(item.scheduledFor), "dd MMM yyyy, HH:mm", { locale: id })}
                        </div>
                      </div>
                      <div className="text-[11px] px-2 py-1 rounded-full" style={{ color: item.status === "confirmed" ? "#86efac" : "#f0b429", backgroundColor: item.status === "confirmed" ? "rgba(134,239,172,0.12)" : "rgba(240,180,41,0.12)" }}>
                        {item.status === "confirmed" ? "Sudah Datang" : "Terjadwal"}
                      </div>
                    </div>
                    <div className="text-sm mt-2" style={{ color: "#c8e6d0" }}>
                      {item.isIncognito ? "Tamu incognito" : item.visitorName}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "rgba(168,213,181,0.78)" }}>{item.agenda}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
        </section>
      )}
    </div>
  );
}
