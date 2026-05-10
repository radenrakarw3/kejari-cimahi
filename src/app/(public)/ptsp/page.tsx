"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  FileText,
  IdCard,
  KeyRound,
  MonitorSmartphone,
  RefreshCcw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KELURAHAN_CIMAHI, RW_OPTIONS } from "@/lib/kelurahan";

type ServiceType = "report" | "follow_up" | "guestbook" | null;

type CategoryOption = {
  id: number;
  nama: string;
  kode: string;
};

type BidangOption = {
  id: number;
  nama: string;
  kode: string;
};

type AppointmentOption = {
  id: number;
  bidangId: number;
  bidangNama: string;
  hostName: string;
  visitorName: string;
  visitorPhone: string | null;
  agenda: string;
  note: string | null;
  scheduledFor: string;
  isIncognito: boolean;
  status: string;
  confirmedAt: string | null;
};

type IdentityData = {
  visitorName: string;
  visitorPhone: string;
  bidangId: string;
  targetName: string;
  appointmentId: string;
  isIncognito: boolean;
};

type ReportData = {
  kelurahan: string;
  rw: string;
  kategoriId: string;
  isiLaporan: string;
};

type FollowUpData = {
  reportNumber: string;
  note: string;
};

const inputStyle = {
  backgroundColor: "#145228",
  borderColor: "rgba(240,180,41,0.25)",
  color: "#c8e6d0",
};

const panelStyle = {
  backgroundColor: "#0d4d22",
  border: "1px solid rgba(240,180,41,0.16)",
};

export default function PtspPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [bidangOptions, setBidangOptions] = useState<BidangOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentOption[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [checkingReportNumber, setCheckingReportNumber] = useState(false);

  const [serviceType, setServiceType] = useState<ServiceType>(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ title: string; description: string; code: string } | null>(null);

  const [identity, setIdentity] = useState<IdentityData>({
    visitorName: "",
    visitorPhone: "",
    bidangId: "",
    targetName: "",
    appointmentId: "",
    isIncognito: false,
  });
  const [reportData, setReportData] = useState<ReportData>({
    kelurahan: "",
    rw: "",
    kategoriId: "",
    isiLaporan: "",
  });
  const [followUpData, setFollowUpData] = useState<FollowUpData>({
    reportNumber: "",
    note: "",
  });
  const [guestbookNote, setGuestbookNote] = useState("");

  const [ktpPhoto, setKtpPhoto] = useState<File | null>(null);
  const [webcamPhoto, setWebcamPhoto] = useState<File | null>(null);
  const [webcamPreview, setWebcamPreview] = useState("");

  const filteredAppointments = useMemo(() => {
    if (!identity.bidangId) return appointments;
    return appointments.filter((item) => String(item.bidangId) === identity.bidangId);
  }, [appointments, identity.bidangId]);

  const steps = useMemo(() => {
    if (serviceType === "report") {
      return [
        "Layanan",
        "Buku Tamu",
        "Verifikasi",
        "Kelurahan",
        "RW",
        "Kategori",
        "Isi Laporan",
        "Review",
      ];
    }

    if (serviceType === "follow_up") {
      return ["Layanan", "Buku Tamu", "Verifikasi", "Nomor Laporan", "Keperluan", "Review"];
    }

    if (serviceType === "guestbook") {
      return ["Layanan", "Buku Tamu", "Verifikasi", "Review"];
    }

    return ["Layanan"];
  }, [serviceType]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/ptsp/session", { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as { authenticated?: boolean } | null;
        setAuthenticated(data?.authenticated === true);
      } finally {
        setAuthChecked(true);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    const loadMeta = async () => {
      setLoadingMeta(true);
      try {
        const [categoryRes, bidangRes, appointmentRes] = await Promise.all([
          fetch("/api/public/categories", { cache: "no-store" }),
          fetch("/api/ptsp/meta", { cache: "no-store" }),
          fetch("/api/ptsp/appointments", { cache: "no-store" }),
        ]);

        if (!categoryRes.ok || !bidangRes.ok || !appointmentRes.ok) {
          throw new Error("Gagal memuat data PTSP");
        }

        const categoryJson = (await categoryRes.json()) as { data?: CategoryOption[] };
        const bidangJson = (await bidangRes.json()) as { bidang?: BidangOption[] };
        const appointmentJson = (await appointmentRes.json()) as { data?: AppointmentOption[] };

        setCategories(categoryJson.data ?? []);
        setBidangOptions(bidangJson.bidang ?? []);
        setAppointments(appointmentJson.data ?? []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal memuat data PTSP");
      } finally {
        setLoadingMeta(false);
      }
    };

    loadMeta();
  }, [authenticated]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (webcamPreview) URL.revokeObjectURL(webcamPreview);
    };
  }, [webcamPreview]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  async function startCamera() {
    setCameraLoading(true);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      toast.error("Webcam tidak bisa diakses. Pastikan izin kamera diberikan.");
    } finally {
      setCameraLoading(false);
    }
  }

  function captureWebcam() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (webcamPreview) URL.revokeObjectURL(webcamPreview);
      const file = new File([blob], `webcam-${Date.now()}.jpg`, { type: "image/jpeg" });
      setWebcamPhoto(file);
      setWebcamPreview(URL.createObjectURL(blob));
      setErrors((prev) => ({ ...prev, webcamPhoto: "" }));
      stopCamera();
      toast.success("Foto webcam berhasil diambil");
    }, "image/jpeg", 0.92);
  }

  function updateIdentity(field: keyof IdentityData, value: string | boolean) {
    setIdentity((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function resetFlow() {
    setServiceType(null);
    setStep(0);
    setErrors({});
    setResult(null);
    setIdentity({
      visitorName: "",
      visitorPhone: "",
      bidangId: "",
      targetName: "",
      appointmentId: "",
      isIncognito: false,
    });
    setReportData({
      kelurahan: "",
      rw: "",
      kategoriId: "",
      isiLaporan: "",
    });
    setFollowUpData({ reportNumber: "", note: "" });
    setGuestbookNote("");
    setKtpPhoto(null);
    setWebcamPhoto(null);
    if (webcamPreview) URL.revokeObjectURL(webcamPreview);
    setWebcamPreview("");
    stopCamera();
  }

  async function validateCurrentStep() {
    if (step === 0) {
      if (!serviceType) {
        setErrors({ serviceType: "Pilih layanan PTSP terlebih dahulu" });
        return false;
      }
      return true;
    }

    if (step === 1) {
      if (!identity.visitorName.trim()) {
        setErrors({ visitorName: "Nama tamu wajib diisi" });
        return false;
      }

      if (serviceType === "guestbook" && !identity.isIncognito && !identity.bidangId) {
        setErrors({ bidangId: "Pilih seksi tujuan atau aktifkan mode incognito" });
        return false;
      }

      return true;
    }

    if (step === 2) {
      if (!ktpPhoto) {
        setErrors({ ktpPhoto: "Foto KTP wajib diunggah" });
        return false;
      }
      if (!webcamPhoto) {
        setErrors({ webcamPhoto: "Foto webcam wajib diambil" });
        return false;
      }
      return true;
    }

    if (serviceType === "report") {
      if (step === 3 && !reportData.kelurahan) {
        setErrors({ kelurahan: "Pilih kelurahan" });
        return false;
      }
      if (step === 4 && !reportData.rw) {
        setErrors({ rw: "Pilih RW" });
        return false;
      }
      if (step === 5 && !reportData.kategoriId) {
        setErrors({ kategoriId: "Pilih kategori laporan" });
        return false;
      }
      if (step === 6 && reportData.isiLaporan.trim().length < 20) {
        setErrors({ isiLaporan: "Isi laporan minimal 20 karakter" });
        return false;
      }
    }

    if (serviceType === "follow_up") {
      if (step === 3) {
        const reportNumber = followUpData.reportNumber.trim().toUpperCase();
        if (!reportNumber) {
          setErrors({ reportNumber: "Nomor laporan wajib diisi" });
          return false;
        }

        setCheckingReportNumber(true);
        try {
          const res = await fetch(`/api/ptsp/report-lookup?number=${encodeURIComponent(reportNumber)}`, {
            cache: "no-store",
          });

          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            setErrors({
              reportNumber: data?.error ?? "Nomor laporan harus persis sama dengan yang terdaftar",
            });
            return false;
          }

          setFollowUpData((prev) => ({ ...prev, reportNumber }));
        } finally {
          setCheckingReportNumber(false);
        }
      }

      if (step === 4 && followUpData.note.trim().length < 10) {
        setErrors({ note: "Keperluan minimal 10 karakter" });
        return false;
      }
    }

    if (serviceType === "guestbook" && step === 3 && guestbookNote.trim().length < 10) {
      setErrors({ guestbookNote: "Keperluan kunjungan minimal 10 karakter" });
      return false;
    }

    return true;
  }

  async function handlePinSubmit() {
    setPinLoading(true);
    try {
      const res = await fetch("/api/ptsp/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "PIN PTSP tidak valid");
      }
      setAuthenticated(true);
      toast.success("Akses PTSP dibuka");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuka akses PTSP");
    } finally {
      setPinLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/ptsp/auth", { method: "DELETE" }).catch(() => null);
    setAuthenticated(false);
    resetFlow();
    toast.success("Sesi PTSP ditutup");
  }

  async function handleSubmit() {
    if (!serviceType || !ktpPhoto || !webcamPhoto) return;
    setSubmitting(true);

    try {
      const basePayload = new FormData();
      basePayload.set("visitorName", identity.visitorName);
      basePayload.set("visitorPhone", identity.visitorPhone);
      basePayload.set("bidangId", serviceType === "guestbook" && !identity.isIncognito ? identity.bidangId : "");
      basePayload.set("targetName", serviceType === "guestbook" ? (identity.isIncognito ? "Incognito" : identity.targetName) : "");
      basePayload.set("appointmentId", serviceType === "guestbook" ? identity.appointmentId : "");
      basePayload.set("isIncognito", String(serviceType === "guestbook" ? identity.isIncognito : false));
      basePayload.set("ktpPhoto", ktpPhoto);
      basePayload.set("webcamPhoto", webcamPhoto);

      if (serviceType === "report") {
        basePayload.set("nama", identity.visitorName);
        basePayload.set("nomorWa", identity.visitorPhone);
        basePayload.set("kelurahan", reportData.kelurahan);
        basePayload.set("rw", reportData.rw);
        basePayload.set("kategoriId", reportData.kategoriId);
        basePayload.set("isiLaporan", reportData.isiLaporan);
        basePayload.set("note", guestbookNote || "Warga datang langsung untuk membuat laporan baru.");

        const res = await fetch("/api/ptsp/report", { method: "POST", body: basePayload });
        const data = (await res.json().catch(() => null)) as { error?: string; id: number; visitorCardNumber: string } | null;
        if (!res.ok) throw new Error(data?.error ?? "Gagal menyimpan laporan PTSP");
        toast.success(`Laporan tersimpan. Kartu visitor ${data?.visitorCardNumber}`);
        router.push(`/ptsp/sukses/${data?.id}?card=${encodeURIComponent(data?.visitorCardNumber ?? "")}`);
        return;
      }

      if (serviceType === "follow_up") {
        basePayload.set("reportNumber", followUpData.reportNumber.toUpperCase());
        basePayload.set("note", followUpData.note);

        const res = await fetch("/api/ptsp/follow-up", { method: "POST", body: basePayload });
        const data = (await res.json().catch(() => null)) as { error?: string; id: number; visitorCardNumber: string; reportNumber: string } | null;
        if (!res.ok) throw new Error(data?.error ?? "Gagal memproses tindak lanjut");
        toast.success(`Kartu visitor ${data?.visitorCardNumber} berhasil dibuat`);
        router.push(`/ptsp/tindak-lanjut/${data?.id}`);
        return;
      }

      basePayload.set("note", guestbookNote);
      const res = await fetch("/api/ptsp/guestbook", { method: "POST", body: basePayload });
      const data = (await res.json().catch(() => null)) as { error?: string; visitorCardNumber: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Gagal menyimpan buku tamu");

      setResult({
        title: "Tamu Berhasil Dicatat",
        description: identity.isIncognito
          ? "Tamu incognito sudah masuk buku tamu PTSP dan dapat diarahkan secara manual."
          : "Tamu sudah masuk buku tamu PTSP dan dapat diarahkan ke seksi/host yang dipilih.",
        code: data?.visitorCardNumber ?? "-",
      });
      toast.success(`Kartu visitor ${data?.visitorCardNumber} berhasil dibuat`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  }

  const progress = steps.length > 1 ? (step / (steps.length - 1)) * 100 : 0;

  if (!authChecked) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#071f0d" }}>
        <div className="text-sm" style={{ color: "#a8d5b5" }}>Memeriksa akses PTSP...</div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: "#071f0d" }}>
        <div className="w-full max-w-md rounded-[28px] p-6" style={panelStyle}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(240,180,41,0.12)" }}>
            <KeyRound className="w-6 h-6" style={{ color: "#f0b429" }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#f5c518" }}>Akses PTSP Front Desk</h1>
          <p className="mt-2 text-sm leading-6" style={{ color: "#a8d5b5" }}>
            Halaman ini bersifat internal. Masukkan PIN front desk untuk membuka buku tamu, layanan datang langsung, dan konfirmasi janji temu.
          </p>
          <div className="mt-5 space-y-2">
            <Label style={{ color: "#f0b429" }}>PIN PTSP</Label>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handlePinSubmit();
              }}
              className="h-12 rounded-xl"
              style={inputStyle}
            />
          </div>
          <Button
            onClick={() => void handlePinSubmit()}
            disabled={pinLoading || pin.trim().length < 4}
            className="mt-5 w-full rounded-xl h-12 font-bold"
            style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
          >
            {pinLoading ? "Memverifikasi..." : "Buka Akses PTSP"}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6" style={{ backgroundColor: "#071f0d" }}>
      <div className="fixed top-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />
      <canvas ref={canvasRef} className="hidden" />

      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] font-semibold" style={{ color: "#f0b429" }}>
              Area Internal PTSP
            </div>
            <h1 className="mt-1 text-2xl font-bold flex items-center gap-2" style={{ color: "#f5c518" }}>
              <MonitorSmartphone className="w-6 h-6" style={{ color: "#f0b429" }} />
              Front Desk Kejari Cimahi
            </h1>
            <p className="text-sm mt-1" style={{ color: "#a8d5b5" }}>
              Buku tamu online, layanan datang langsung, dan pencocokan janji temu antar seksi.
            </p>
          </div>

          <div className="flex gap-2">
            <Link href="/">
              <Button variant="ghost" className="rounded-xl" style={{ color: "#a8d5b5" }}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <Button
              onClick={() => void handleLogout()}
              variant="outline"
              className="rounded-xl"
              style={{ borderColor: "rgba(240,180,41,0.25)", color: "#f0b429", backgroundColor: "rgba(240,180,41,0.08)" }}
            >
              Tutup Sesi PTSP
            </Button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[28px] p-6 sm:p-8" style={panelStyle}>
            {result ? (
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(74,222,128,0.12)" }}>
                  <CheckCircle2 className="w-7 h-7" style={{ color: "#86efac" }} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: "#f5c518" }}>{result.title}</h2>
                  <p className="mt-2 text-sm leading-6" style={{ color: "#a8d5b5" }}>{result.description}</p>
                </div>
                <div className="rounded-2xl p-5" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.18)" }}>
                  <div className="text-xs uppercase tracking-[0.24em] font-semibold" style={{ color: "#f0b429" }}>
                    Nomor Kartu Visitor
                  </div>
                  <div className="mt-2 text-2xl font-mono font-bold" style={{ color: "#f5c518" }}>
                    {result.code}
                  </div>
                </div>
                <Button
                  onClick={resetFlow}
                  className="rounded-xl"
                  style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
                >
                  Input Tamu Berikutnya
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex items-center justify-between text-xs mb-2" style={{ color: "#a8d5b5" }}>
                    <span>Langkah {step + 1} dari {steps.length}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #f0b429, #f5c518)" }} />
                  </div>
                </div>

                <div className="min-h-[540px]">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-xl border flex items-center justify-center" style={{ backgroundColor: "rgba(240,180,41,0.12)", borderColor: "rgba(240,180,41,0.24)" }}>
                      {step === 0 ? (
                        <ShieldCheck className="w-5 h-5" style={{ color: "#f0b429" }} />
                      ) : step === 2 ? (
                        <Camera className="w-5 h-5" style={{ color: "#f0b429" }} />
                      ) : serviceType === "follow_up" ? (
                        <Search className="w-5 h-5" style={{ color: "#f0b429" }} />
                      ) : serviceType === "guestbook" ? (
                        <Users className="w-5 h-5" style={{ color: "#f0b429" }} />
                      ) : (
                        <FileText className="w-5 h-5" style={{ color: "#f0b429" }} />
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold" style={{ color: "#f5c518" }}>{steps[step]}</h2>
                      <p className="text-sm" style={{ color: "#a8d5b5" }}>
                        {step === 1
                          ? "Catat identitas tamu, tujuan seksi, host yang akan ditemui, atau aktifkan mode incognito."
                          : step === 2
                            ? "Ambil bukti identitas awal dengan foto KTP dan webcam."
                            : "Lengkapi proses layanan front desk."}
                      </p>
                    </div>
                  </div>

                  {step === 0 && (
                    <div className="grid gap-4 md:grid-cols-3">
                      {[
                        {
                          key: "report" as const,
                          icon: FileText,
                          title: "Buat Laporan Baru",
                          desc: "Warga datang langsung untuk membuat pengaduan baru.",
                        },
                        {
                          key: "follow_up" as const,
                          icon: Search,
                          title: "Tanya Tindak Lanjut",
                          desc: "Warga ingin menanyakan perkembangan laporan yang sudah ada.",
                        },
                        {
                          key: "guestbook" as const,
                          icon: Users,
                          title: "Buku Tamu / Janji Temu",
                          desc: "Pencatatan tamu umum, kunjungan seksi, atau tamu incognito.",
                        },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setServiceType(item.key);
                            setErrors({});
                          }}
                          className="rounded-2xl border p-5 text-left transition-all"
                          style={{
                            backgroundColor: serviceType === item.key ? "rgba(240,180,41,0.10)" : "#145228",
                            borderColor: serviceType === item.key ? "rgba(240,180,41,0.34)" : "rgba(240,180,41,0.18)",
                          }}
                        >
                          <item.icon className="w-5 h-5 mb-3" style={{ color: "#f0b429" }} />
                          <div className="font-semibold" style={{ color: "#f5c518" }}>{item.title}</div>
                          <p className="text-sm mt-2 leading-6" style={{ color: "#a8d5b5" }}>{item.desc}</p>
                        </button>
                      ))}
                      {errors.serviceType && <p className="md:col-span-3 text-sm text-red-400">{errors.serviceType}</p>}
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label style={{ color: "#f0b429" }}>Nama Tamu</Label>
                          <Input
                            value={identity.visitorName}
                            onChange={(e) => updateIdentity("visitorName", e.target.value)}
                            className="h-12 rounded-xl"
                            style={inputStyle}
                          />
                          {errors.visitorName && <p className="text-sm text-red-400">{errors.visitorName}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label style={{ color: "#f0b429" }}>Nomor WhatsApp</Label>
                          <Input
                            value={identity.visitorPhone}
                            onChange={(e) => updateIdentity("visitorPhone", e.target.value)}
                            placeholder="Opsional"
                            className="h-12 rounded-xl"
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      {serviceType === "guestbook" && (
                        <>
                          <label className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.14)" }}>
                            <input
                              type="checkbox"
                              checked={identity.isIncognito}
                              onChange={(e) => updateIdentity("isIncognito", e.target.checked)}
                            />
                            <span className="text-sm" style={{ color: "#c8e6d0" }}>
                              Tamu memilih mode incognito dan tidak ingin diarahkan ke seksi tertentu di tampilan depan.
                            </span>
                          </label>

                          {!identity.isIncognito && (
                            <>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label style={{ color: "#f0b429" }}>Seksi Tujuan</Label>
                                  <select
                                    value={identity.bidangId}
                                    onChange={(e) => {
                                      updateIdentity("bidangId", e.target.value);
                                      updateIdentity("appointmentId", "");
                                    }}
                                    className="h-12 w-full rounded-xl border px-3 text-sm"
                                    style={inputStyle}
                                  >
                                    <option value="">Pilih seksi...</option>
                                    {bidangOptions.map((item) => (
                                      <option key={item.id} value={item.id}>{item.nama}</option>
                                    ))}
                                  </select>
                                  {errors.bidangId && <p className="text-sm text-red-400">{errors.bidangId}</p>}
                                </div>
                                <div className="space-y-2">
                                  <Label style={{ color: "#f0b429" }}>Bertemu Siapa</Label>
                                  <Input
                                    value={identity.targetName}
                                    onChange={(e) => updateIdentity("targetName", e.target.value)}
                                    placeholder="Nama jaksa / petugas / host"
                                    className="h-12 rounded-xl"
                                    style={inputStyle}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label style={{ color: "#f0b429" }}>Cocokkan Dengan Janji Temu Hari Ini</Label>
                                <select
                                  value={identity.appointmentId}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    updateIdentity("appointmentId", value);
                                    const selected = filteredAppointments.find((item) => String(item.id) === value);
                                    if (selected) {
                                      updateIdentity("targetName", selected.hostName);
                                    }
                                  }}
                                  className="h-12 w-full rounded-xl border px-3 text-sm"
                                  style={inputStyle}
                                >
                                  <option value="">Tidak ada / tamu walk-in</option>
                                  {filteredAppointments.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {new Date(item.scheduledFor).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - {item.hostName} / {item.visitorName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </>
                          )}
                        </>
                      )}

                      <div className="space-y-2">
                        <Label style={{ color: "#f0b429" }}>
                          {serviceType === "guestbook" ? "Keperluan Kunjungan" : "Catatan Front Desk"}
                        </Label>
                        <Textarea
                          value={serviceType === "guestbook" ? guestbookNote : serviceType === "follow_up" ? followUpData.note : guestbookNote}
                          onChange={(e) => {
                            if (serviceType === "guestbook") setGuestbookNote(e.target.value);
                            if (serviceType === "report") setGuestbookNote(e.target.value);
                            if (serviceType === "follow_up") setFollowUpData((prev) => ({ ...prev, note: e.target.value }));
                          }}
                          className="min-h-[96px] rounded-xl"
                          style={inputStyle}
                          placeholder="Contoh: ingin bertemu Kasi Pidsus / meminta update tindak lanjut / membuat laporan baru."
                        />
                        {errors.guestbookNote && <p className="text-sm text-red-400">{errors.guestbookNote}</p>}
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl p-4" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.14)" }}>
                        <div className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: "#f5c518" }}>
                          <IdCard className="w-4 h-4" />
                          Foto KTP
                        </div>
                        <label
                          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-8 text-center"
                          style={{ borderColor: "rgba(240,180,41,0.24)", color: "#c8e6d0" }}
                        >
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setKtpPhoto(file);
                              setErrors((prev) => ({ ...prev, ktpPhoto: "" }));
                            }}
                          />
                          <div className="font-semibold">{ktpPhoto ? ktpPhoto.name : "Unggah foto KTP"}</div>
                          <div className="mt-1 text-xs" style={{ color: "#a8d5b5" }}>Wajib sebelum lanjut</div>
                        </label>
                        {errors.ktpPhoto && <p className="mt-2 text-sm text-red-400">{errors.ktpPhoto}</p>}
                      </div>

                      <div className="rounded-2xl p-4" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.14)" }}>
                        <div className="flex items-center gap-2 text-sm font-semibold mb-3" style={{ color: "#f5c518" }}>
                          <Camera className="w-4 h-4" />
                          Foto Wajah via Webcam
                        </div>

                        {webcamPreview ? (
                          <div className="space-y-3">
                            <div className="relative h-44 w-full overflow-hidden rounded-2xl">
                              <Image src={webcamPreview} alt="Preview webcam" fill className="object-cover" unoptimized />
                            </div>
                            <Button
                              type="button"
                              onClick={() => {
                                if (webcamPreview) URL.revokeObjectURL(webcamPreview);
                                setWebcamPreview("");
                                setWebcamPhoto(null);
                                void startCamera();
                              }}
                              className="w-full rounded-xl"
                              style={{ backgroundColor: "rgba(240,180,41,0.12)", color: "#f5c518", border: "1px solid rgba(240,180,41,0.22)" }}
                            >
                              <RefreshCcw className="w-4 h-4 mr-2" />
                              Ambil Ulang Foto
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(240,180,41,0.18)" }}>
                              <video ref={videoRef} className="h-44 w-full bg-black object-cover" playsInline muted />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={() => void startCamera()}
                                disabled={cameraLoading}
                                className="flex-1 rounded-xl"
                                style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
                              >
                                {cameraLoading ? "Menghubungkan..." : "Nyalakan Webcam"}
                              </Button>
                              <Button
                                type="button"
                                onClick={captureWebcam}
                                disabled={!cameraReady}
                                className="flex-1 rounded-xl"
                                style={{ backgroundColor: "rgba(240,180,41,0.12)", color: "#f5c518", border: "1px solid rgba(240,180,41,0.22)" }}
                              >
                                Ambil Foto
                              </Button>
                            </div>
                          </div>
                        )}
                        {errors.webcamPhoto && <p className="mt-2 text-sm text-red-400">{errors.webcamPhoto}</p>}
                      </div>
                    </div>
                  )}

                  {serviceType === "report" && step === 3 && (
                    <div className="space-y-2">
                      <Label style={{ color: "#f0b429" }}>Kelurahan</Label>
                      <select
                        value={reportData.kelurahan}
                        onChange={(e) => {
                          setReportData((prev) => ({ ...prev, kelurahan: e.target.value, rw: "" }));
                          setErrors((prev) => ({ ...prev, kelurahan: "" }));
                        }}
                        className="h-12 w-full rounded-xl border px-3 text-sm"
                        style={inputStyle}
                      >
                        <option value="">Pilih kelurahan...</option>
                        {KELURAHAN_CIMAHI.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                      {errors.kelurahan && <p className="text-sm text-red-400">{errors.kelurahan}</p>}
                    </div>
                  )}

                  {serviceType === "report" && step === 4 && (
                    <div className="space-y-2">
                      <Label style={{ color: "#f0b429" }}>RW</Label>
                      <select
                        value={reportData.rw}
                        onChange={(e) => {
                          setReportData((prev) => ({ ...prev, rw: e.target.value }));
                          setErrors((prev) => ({ ...prev, rw: "" }));
                        }}
                        className="h-12 w-full rounded-xl border px-3 text-sm"
                        style={inputStyle}
                      >
                        <option value="">Pilih RW...</option>
                        {RW_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                      </select>
                      {errors.rw && <p className="text-sm text-red-400">{errors.rw}</p>}
                    </div>
                  )}

                  {serviceType === "report" && step === 5 && (
                    <div className="space-y-2">
                      <Label style={{ color: "#f0b429" }}>Kategori Laporan</Label>
                      <select
                        value={reportData.kategoriId}
                        onChange={(e) => {
                          setReportData((prev) => ({ ...prev, kategoriId: e.target.value }));
                          setErrors((prev) => ({ ...prev, kategoriId: "" }));
                        }}
                        className="h-12 w-full rounded-xl border px-3 text-sm"
                        style={inputStyle}
                        disabled={loadingMeta}
                      >
                        <option value="">Pilih kategori...</option>
                        {categories.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}
                      </select>
                      {errors.kategoriId && <p className="text-sm text-red-400">{errors.kategoriId}</p>}
                    </div>
                  )}

                  {serviceType === "report" && step === 6 && (
                    <div className="space-y-2">
                      <Label style={{ color: "#f0b429" }}>Isi Laporan</Label>
                      <Textarea
                        value={reportData.isiLaporan}
                        onChange={(e) => {
                          setReportData((prev) => ({ ...prev, isiLaporan: e.target.value }));
                          setErrors((prev) => ({ ...prev, isiLaporan: "" }));
                        }}
                        className="min-h-[220px] rounded-xl"
                        style={inputStyle}
                      />
                      {errors.isiLaporan && <p className="text-sm text-red-400">{errors.isiLaporan}</p>}
                    </div>
                  )}

                  {serviceType === "follow_up" && step === 3 && (
                    <div className="space-y-2">
                      <Label style={{ color: "#f0b429" }}>Nomor Laporan</Label>
                      <Input
                        value={followUpData.reportNumber}
                        onChange={(e) => {
                          setFollowUpData((prev) => ({ ...prev, reportNumber: e.target.value.toUpperCase() }));
                          setErrors((prev) => ({ ...prev, reportNumber: "" }));
                        }}
                        className="h-12 rounded-xl"
                        style={inputStyle}
                      />
                      {errors.reportNumber && <p className="text-sm text-red-400">{errors.reportNumber}</p>}
                    </div>
                  )}

                  {serviceType === "follow_up" && step === 4 && (
                    <div className="space-y-2">
                      <Label style={{ color: "#f0b429" }}>Keperluan / Pertanyaan</Label>
                      <Textarea
                        value={followUpData.note}
                        onChange={(e) => {
                          setFollowUpData((prev) => ({ ...prev, note: e.target.value }));
                          setErrors((prev) => ({ ...prev, note: "" }));
                        }}
                        className="min-h-[180px] rounded-xl"
                        style={inputStyle}
                      />
                      {errors.note && <p className="text-sm text-red-400">{errors.note}</p>}
                    </div>
                  )}

                  {((serviceType === "report" && step === 7) ||
                    (serviceType === "follow_up" && step === 5) ||
                    (serviceType === "guestbook" && step === 3)) && (
                    <div className="space-y-4">
                      <div className="rounded-2xl p-4" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.14)" }}>
                        <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: "#f0b429" }}>
                          Ringkasan Tamu
                        </div>
                          <div className="grid gap-3 md:grid-cols-2 text-sm" style={{ color: "#c8e6d0" }}>
                            <div>Nama: {identity.visitorName}</div>
                            <div>WA: {identity.visitorPhone || "-"}</div>
                            {serviceType === "guestbook" ? (
                              <>
                                <div>Seksi: {identity.isIncognito ? "Incognito" : (bidangOptions.find((item) => String(item.id) === identity.bidangId)?.nama ?? "-")}</div>
                                <div>Bertemu: {identity.isIncognito ? "Incognito" : (identity.targetName || "-")}</div>
                              </>
                            ) : (
                              <>
                                <div>Layanan: {serviceType === "report" ? "Buat Laporan Baru" : "Tanya Tindak Lanjut"}</div>
                                <div>Penanganan: Front Desk PTSP</div>
                              </>
                            )}
                          </div>
                        </div>

                      {serviceType === "report" && (
                        <div className="rounded-2xl p-4" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.14)" }}>
                          <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: "#f0b429" }}>
                            Ringkasan Laporan
                          </div>
                          <div className="space-y-2 text-sm" style={{ color: "#c8e6d0" }}>
                            <div>{reportData.kelurahan} RW {reportData.rw}</div>
                            <div>{categories.find((item) => String(item.id) === reportData.kategoriId)?.nama ?? "-"}</div>
                            <p className="whitespace-pre-wrap">{reportData.isiLaporan}</p>
                          </div>
                        </div>
                      )}

                      {serviceType === "follow_up" && (
                        <div className="rounded-2xl p-4" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.14)" }}>
                          <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: "#f0b429" }}>
                            Ringkasan Tindak Lanjut
                          </div>
                          <div className="space-y-2 text-sm" style={{ color: "#c8e6d0" }}>
                            <div>Nomor laporan: {followUpData.reportNumber}</div>
                            <p className="whitespace-pre-wrap">{followUpData.note}</p>
                          </div>
                        </div>
                      )}

                      {serviceType === "guestbook" && (
                        <div className="rounded-2xl p-4" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.14)" }}>
                          <div className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: "#f0b429" }}>
                            Ringkasan Buku Tamu
                          </div>
                          <p className="text-sm whitespace-pre-wrap" style={{ color: "#c8e6d0" }}>{guestbookNote}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setStep((current) => Math.max(0, current - 1));
                    }}
                    disabled={step === 0 || submitting}
                    variant="outline"
                    className="rounded-xl"
                    style={{ borderColor: "rgba(240,180,41,0.25)", color: "#f0b429", backgroundColor: "rgba(240,180,41,0.08)" }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kembali
                  </Button>

                  {step === steps.length - 1 ? (
                    <Button
                      onClick={() => void handleSubmit()}
                      disabled={submitting}
                      className="rounded-xl"
                      style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
                    >
                      {submitting ? "Menyimpan..." : "Simpan & Lanjutkan"}
                    </Button>
                  ) : (
                    <Button
                      onClick={async () => {
                        if (!(await validateCurrentStep())) return;
                        setStep((current) => current + 1);
                      }}
                      disabled={checkingReportNumber}
                      className="rounded-xl"
                      style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
                    >
                      {checkingReportNumber ? "Memeriksa kode..." : "Lanjut"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] p-5" style={panelStyle}>
              <div className="text-xs uppercase tracking-[0.22em] font-semibold" style={{ color: "#f0b429" }}>
                Janji Temu Hari Ini
              </div>
              <div className="mt-3 space-y-3">
                {appointments.length === 0 ? (
                  <p className="text-sm" style={{ color: "#a8d5b5" }}>
                    Belum ada janji temu yang diinput seksi untuk hari ini.
                  </p>
                ) : (
                  appointments.slice(0, 6).map((item) => (
                    <div key={item.id} className="rounded-2xl p-3" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.12)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold" style={{ color: "#f5c518" }}>{item.hostName}</div>
                        <div className="text-[11px] px-2 py-1 rounded-full" style={{ color: item.status === "confirmed" ? "#86efac" : "#f0b429", backgroundColor: item.status === "confirmed" ? "rgba(134,239,172,0.12)" : "rgba(240,180,41,0.12)" }}>
                          {item.status === "confirmed" ? "Dikonfirmasi PTSP" : "Terjadwal"}
                        </div>
                      </div>
                      <div className="text-xs mt-1" style={{ color: "#a8d5b5" }}>
                        {item.bidangNama} • {new Date(item.scheduledFor).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
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

            <div className="rounded-[28px] p-5" style={panelStyle}>
              <div className="text-xs uppercase tracking-[0.22em] font-semibold" style={{ color: "#f0b429" }}>
                Kebijakan Akses
              </div>
              <ul className="mt-3 space-y-2 text-sm leading-6" style={{ color: "#a8d5b5" }}>
                <li>Foto KTP dan webcam wajib sebelum layanan dilanjutkan.</li>
                <li>Nomor kartu visitor dibuat otomatis setiap tamu dicatat.</li>
                <li>Janji temu yang dipilih akan otomatis terkonfirmasi saat tamu datang.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
