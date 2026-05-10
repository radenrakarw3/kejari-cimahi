"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KELURAHAN_CIMAHI, RW_OPTIONS } from "@/lib/kelurahan";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Send,
  Paperclip,
  User,
  Phone,
  MapPin,
  Home,
  FileText,
  Eye,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { z } from "zod";

interface FormData {
  isAnonymous: boolean | null;
  nama: string;
  nomorWa: string;
  waVerificationId: string;
  kelurahan: string;
  rw: string;
  kategoriId: string;
  isiLaporan: string;
}

type StepField = "identityType" | "nama" | "nomorWa" | "kelurahan" | "rw" | "kategoriId" | "isiLaporan" | "review";

type StepConfig = {
  title: string;
  desc: string;
  icon: LucideIcon;
  field: StepField;
};

type CategoryOption = {
  id: number;
  nama: string;
  kode: string;
  warna: string;
};

const stepSchemas: Record<Exclude<StepField, "review">, z.ZodTypeAny> = {
  identityType: z.object({ isAnonymous: z.boolean() }),
  nama: z.object({ nama: z.string().min(3, "Nama minimal 3 karakter") }),
  nomorWa: z.object({
    nomorWa: z
      .string()
      .regex(/^(08|628)\d{8,12}$/, "Format: 08123456789 atau 628123456789"),
  }),
  kelurahan: z.object({ kelurahan: z.string().min(1, "Pilih kelurahan") }),
  rw: z.object({ rw: z.string().min(1, "Pilih RW") }),
  kategoriId: z.object({ kategoriId: z.string().min(1, "Pilih kategori laporan") }),
  isiLaporan: z.object({
    isiLaporan: z
      .string()
      .min(20, "Minimal 20 karakter")
      .max(2000, "Maksimal 2000 karakter"),
  }),
};

const BASE_STEPS: StepConfig[] = [
  { title: "Jenis Pelaporan", desc: "Pilih apakah Anda ingin melapor anonim atau dengan identitas", icon: ShieldCheck, field: "identityType" },
  { title: "Kelurahan", desc: "Di kelurahan mana Anda tinggal?", icon: MapPin, field: "kelurahan" },
  { title: "RW", desc: "RW berapa lokasi Anda?", icon: Home, field: "rw" },
  { title: "Kategori Laporan", desc: "Pilih jenis laporan Anda", icon: FileText, field: "kategoriId" },
  { title: "Isi Laporan", desc: "Ceritakan laporan Anda secara detail", icon: FileText, field: "isiLaporan" },
  { title: "Review & Kirim", desc: "Periksa kembali sebelum mengirim", icon: Eye, field: "review" },
];

const IDENTITY_STEPS: StepConfig[] = [
  { title: "Nama Lengkap", desc: "Siapa nama Anda?", icon: User, field: "nama" },
  { title: "Nomor WhatsApp", desc: "Nomor untuk menerima konfirmasi", icon: Phone, field: "nomorWa" },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeInOut" as const } },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeInOut" as const },
  }),
};

const inputStyle = {
  backgroundColor: "rgba(7,31,13,0.42)",
  borderColor: "rgba(240,180,41,0.18)",
  color: "#c8e6d0",
};

const labelStyle = { color: "#f0b429" };
const errorStyle = { color: "#f87171" };
const selectPopupStyle = {
  backgroundColor: "#0c3418",
  borderColor: "rgba(240,180,41,0.22)",
  color: "#d9f0df",
  boxShadow: "0 22px 60px rgba(2, 12, 6, 0.45)",
  backdropFilter: "blur(14px)",
};

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function ReportWizard() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpResendIn, setOtpResendIn] = useState(0);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [formData, setFormData] = useState<FormData>({
    isAnonymous: null,
    nama: "",
    nomorWa: "",
    waVerificationId: "",
    kelurahan: "",
    rw: "",
    kategoriId: "",
    isiLaporan: "",
  });

  const steps = [
    BASE_STEPS[0],
    ...(formData.isAnonymous ? [] : IDENTITY_STEPS),
    ...BASE_STEPS.slice(1),
  ];
  const currentStep = steps[step] ?? steps[0];
  const isReviewStep = currentStep?.field === "review";
  const progress = (step / (steps.length - 1)) * 100;

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch("/api/public/categories");
        const data = await res.json();
        setCategories(data.data ?? []);
      } catch {
        toast.error("Gagal memuat kategori laporan");
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    if (otpResendIn <= 0) return;
    const timer = window.setInterval(() => {
      setOtpResendIn((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpResendIn]);

  const resetOtpState = () => {
    setOtpCode("");
    setOtpSent(false);
    setOtpVerified(false);
    setOtpResendIn(0);
    setFormData((prev) => ({ ...prev, waVerificationId: "" }));
  };

  const updateField = (field: keyof FormData, value: string) => {
    if (field === "nomorWa") {
      setOtpCode("");
      setOtpSent(false);
      setOtpVerified(false);
      setOtpResendIn(0);
    }
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "nomorWa" ? { waVerificationId: "" } : {}),
    }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const chooseIdentityType = (isAnonymous: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isAnonymous,
      nama: isAnonymous ? "" : prev.nama,
      nomorWa: isAnonymous ? "" : prev.nomorWa,
      waVerificationId: isAnonymous ? "" : prev.waVerificationId,
    }));
    if (isAnonymous) {
      resetOtpState();
    }
    setErrors({});
  };

  const validateStep = (): boolean => {
    if (isReviewStep) return true;
    const field = currentStep.field;
    const schema = stepSchemas[field as Exclude<StepField, "review">];
    const payload =
      field === "identityType"
        ? { isAnonymous: formData.isAnonymous }
        : { [field]: formData[field as keyof FormData] };
    const result = schema.safeParse(payload);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      const errorKey = field === "identityType" ? "isAnonymous" : field;
      const msg = fieldErrors[errorKey]?.[0] ?? "Input tidak valid";
      setErrors({ [errorKey]: msg });
      return false;
    }

    if (field === "nomorWa" && !otpVerified) {
      setErrors({ nomorWa: "Verifikasi OTP 4 digit wajib diselesaikan terlebih dahulu" });
      return false;
    }

    return true;
  };

  const sendOtp = async () => {
    const result = stepSchemas.nomorWa.safeParse({ nomorWa: formData.nomorWa });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      setErrors({ nomorWa: fieldErrors.nomorWa?.[0] ?? "Nomor WhatsApp tidak valid" });
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch("/api/public/wa-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomorWa: formData.nomorWa }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Gagal mengirim OTP");
      }

      setOtpSent(true);
      setOtpVerified(false);
      setOtpCode("");
      setOtpResendIn(data.resendInSeconds ?? 60);
      setFormData((prev) => ({ ...prev, waVerificationId: "" }));
      setErrors({});
      toast.success("OTP 4 digit berhasil dikirim ke WhatsApp");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengirim OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{4}$/.test(otpCode)) {
      setErrors({ otp: "Masukkan 4 digit OTP" });
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await fetch("/api/public/wa-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomorWa: formData.nomorWa, otp: otpCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "OTP tidak valid");
      }

      setOtpVerified(true);
      setErrors((prev) => ({ ...prev, nomorWa: "", otp: "" }));
      setFormData((prev) => ({ ...prev, waVerificationId: data.verificationId }));
      toast.success("Nomor WhatsApp berhasil diverifikasi");
    } catch (error) {
      setOtpVerified(false);
      setFormData((prev) => ({ ...prev, waVerificationId: "" }));
      setErrors({ otp: error instanceof Error ? error.message : "OTP tidak valid" });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setDirection(1);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
    setErrors({});
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.set("isAnonymous", String(formData.isAnonymous === true));
      payload.set("nama", formData.isAnonymous ? "Anonim" : formData.nama);
      payload.set("nomorWa", formData.isAnonymous ? "" : formData.nomorWa);
      payload.set("waVerificationId", formData.waVerificationId);
      payload.set("kelurahan", formData.kelurahan);
      payload.set("rw", formData.rw);
      payload.set("kategoriId", formData.kategoriId);
      payload.set("isiLaporan", formData.isiLaporan);
      payload.set("source", "web");
      attachments.forEach((file) => payload.append("attachments", file));

      const res = await fetch("/api/reports", {
        method: "POST",
        body: payload,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal mengirim laporan");
      }
      const { id } = await res.json();
      router.push(`/lapor/sukses/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttachmentSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

    const nextFiles = [...attachments, ...selectedFiles];
    if (nextFiles.length > MAX_ATTACHMENTS) {
      toast.error(`Maksimal ${MAX_ATTACHMENTS} lampiran`);
      event.target.value = "";
      return;
    }

    for (const file of selectedFiles) {
      if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
        toast.error(`Tipe file tidak didukung: ${file.name}`);
        event.target.value = "";
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`Ukuran file terlalu besar: ${file.name}`);
        event.target.value = "";
        return;
      }
    }

    setAttachments(nextFiles);
    event.target.value = "";
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div
      className="w-full rounded-[28px] p-4 sm:p-5"
      style={{
        background:
          "linear-gradient(180deg, rgba(240,180,41,0.08) 0%, rgba(8,36,17,0.86) 16%, rgba(9,43,19,0.96) 100%)",
        border: "1px solid rgba(240,180,41,0.16)",
        boxShadow: "0 30px 80px rgba(3, 14, 7, 0.28)",
      }}
    >
      <div
        className="mb-5 rounded-2xl px-4 py-3 sm:px-5"
        style={{
          backgroundColor: "rgba(240,180,41,0.08)",
          border: "1px solid rgba(240,180,41,0.16)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
            style={{ backgroundColor: "rgba(240,180,41,0.14)" }}
          >
            <ShieldCheck className="w-5 h-5" style={{ color: "#f0b429" }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#f0b429" }}>
              <Sparkles className="w-3.5 h-3.5" />
              SAHATE Pengaduan
            </div>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "#c8e6d0" }}>
              Isi pengaduan Anda secara bertahap. Form ini dirancang agar rapi, aman, dan mudah diproses oleh tim SAHATE Kejari Cimahi.
            </p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div
        className="mb-7 rounded-2xl px-4 py-4 sm:px-5"
        style={{ backgroundColor: "rgba(7,31,13,0.28)", border: "1px solid rgba(240,180,41,0.08)" }}
      >
        <div className="flex items-center justify-between text-xs mb-2" style={{ color: "#a8d5b5" }}>
          <span className="font-medium">Langkah {step + 1} dari {steps.length}</span>
          <span style={{ color: "#f0b429" }}>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(240,180,41,0.15)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: "#f0b429" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        </div>
        {/* Dots */}
        <div className="flex justify-between mt-2.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i < step ? "#f0b429" : i === step ? "#f5c518" : "rgba(240,180,41,0.2)",
                transform: i === step ? "scale(1.4)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div
        className="overflow-hidden min-h-[300px] flex flex-col rounded-[24px] px-4 py-5 sm:px-5 sm:py-6"
        style={{
          backgroundColor: "rgba(5,24,11,0.34)",
          border: "1px solid rgba(240,180,41,0.12)",
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex-1"
          >
            {/* Step header */}
            <div className="flex items-center gap-3 mb-7">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(180deg, rgba(240,180,41,0.22), rgba(240,180,41,0.08))" }}
              >
                {(() => {
                  const Icon = currentStep.icon;
                  return <Icon className="w-5 h-5" style={{ color: "#f0b429" }} />;
                })()}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-xl leading-tight" style={{ color: "#f5c518" }}>{currentStep.title}</h2>
                <p className="text-sm leading-relaxed mt-1" style={{ color: "#a8d5b5" }}>{currentStep.desc}</p>
              </div>
            </div>

            {currentStep.field === "identityType" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => chooseIdentityType(false)}
                  className="w-full rounded-2xl border px-4 py-4 text-left transition-all"
                  style={{
                    backgroundColor: formData.isAnonymous === false ? "rgba(240,180,41,0.12)" : "rgba(7,31,13,0.42)",
                    borderColor: formData.isAnonymous === false ? "rgba(240,180,41,0.45)" : "rgba(240,180,41,0.14)",
                  }}
                >
                  <div className="font-semibold text-sm" style={{ color: "#f5c518" }}>Dengan Identitas</div>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: "#c8e6d0" }}>
                    Isi nama dan nomor WhatsApp agar tim dapat mengirim konfirmasi dan tindak lanjut.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => chooseIdentityType(true)}
                  className="w-full rounded-2xl border px-4 py-4 text-left transition-all"
                  style={{
                    backgroundColor: formData.isAnonymous === true ? "rgba(240,180,41,0.12)" : "rgba(7,31,13,0.42)",
                    borderColor: formData.isAnonymous === true ? "rgba(240,180,41,0.45)" : "rgba(240,180,41,0.14)",
                  }}
                >
                  <div className="font-semibold text-sm" style={{ color: "#f5c518" }}>Anonim</div>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: "#c8e6d0" }}>
                    Nama dan nomor WhatsApp tidak akan ditanyakan. Anda tetap bisa mengirim laporan secara aman.
                  </p>
                </button>
                {errors.isAnonymous && <p className="text-xs mt-1" style={errorStyle}>{errors.isAnonymous}</p>}
              </div>
            )}

            {currentStep.field === "nama" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={labelStyle}>Nama Lengkap</Label>
                <Input
                  placeholder="Contoh: Budi Santoso"
                  value={formData.nama}
                  onChange={(e) => updateField("nama", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                  className="h-12 rounded-xl text-sm placeholder:opacity-40"
                  style={inputStyle}
                  autoFocus
                />
                {errors.nama && <p className="text-xs mt-1" style={errorStyle}>{errors.nama}</p>}
              </div>
            )}

            {currentStep.field === "nomorWa" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={labelStyle}>Nomor WhatsApp</Label>
                <Input
                  placeholder="08123456789"
                  value={formData.nomorWa}
                  onChange={(e) => updateField("nomorWa", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                  type="tel"
                  inputMode="numeric"
                  className="h-12 rounded-xl text-sm placeholder:opacity-40"
                  style={inputStyle}
                  autoFocus
                />
                {errors.nomorWa && <p className="text-xs mt-1" style={errorStyle}>{errors.nomorWa}</p>}
                <div className="mt-3 flex flex-col gap-3 rounded-2xl p-3" style={{ backgroundColor: "rgba(240,180,41,0.06)", border: "1px solid rgba(240,180,41,0.12)" }}>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      onClick={sendOtp}
                      disabled={sendingOtp || otpResendIn > 0}
                      className="rounded-xl text-sm sm:flex-1"
                      style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
                    >
                      {sendingOtp ? "Mengirim OTP..." : otpResendIn > 0 ? `Kirim Ulang ${otpResendIn}s` : otpSent ? "Kirim Ulang OTP" : "Kirim OTP"}
                    </Button>
                    {otpVerified && (
                      <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold" style={{ backgroundColor: "rgba(74,222,128,0.12)", color: "#86efac" }}>
                        <Check className="w-4 h-4" />
                        Terverifikasi
                      </div>
                    )}
                  </div>

                  {otpSent && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium" style={labelStyle}>Kode OTP 4 Digit</Label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          placeholder="1234"
                          value={otpCode}
                          onChange={(e) => {
                            setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4));
                            setErrors((prev) => ({ ...prev, otp: "" }));
                          }}
                          inputMode="numeric"
                          className="h-12 rounded-xl text-sm placeholder:opacity-40 sm:flex-1"
                          style={inputStyle}
                        />
                        <Button
                          type="button"
                          onClick={verifyOtp}
                          disabled={verifyingOtp || otpVerified}
                          className="rounded-xl text-sm"
                          style={{ backgroundColor: otpVerified ? "#145228" : "#f0b429", color: otpVerified ? "#86efac" : "#071f0d" }}
                        >
                          {verifyingOtp ? "Memverifikasi..." : otpVerified ? "OTP Valid" : "Verifikasi OTP"}
                        </Button>
                      </div>
                      {errors.otp && <p className="text-xs" style={errorStyle}>{errors.otp}</p>}
                    </div>
                  )}
                </div>
                <p className="text-xs" style={{ color: "rgba(168,213,181,0.5)" }}>Konfirmasi laporan akan dikirim ke nomor ini setelah OTP berhasil diverifikasi</p>
              </div>
            )}

            {/* Step 2 — Kelurahan */}
            {currentStep.field === "kelurahan" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={labelStyle}>Kelurahan</Label>
                <Select
                  value={formData.kelurahan}
                  onValueChange={(v) => updateField("kelurahan", v ?? "")}
                >
                  <SelectTrigger
                    className="h-12 w-full rounded-xl text-sm px-3"
                    style={inputStyle}
                  >
                    <SelectValue placeholder="Pilih kelurahan..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl p-2" style={selectPopupStyle}>
                    {KELURAHAN_CIMAHI.map((k) => (
                      <SelectItem key={k} value={k} className="rounded-xl px-3 py-2.5 text-sm" style={{ color: "#d9f0df" }}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.kelurahan && <p className="text-xs mt-1" style={errorStyle}>{errors.kelurahan}</p>}
              </div>
            )}

            {/* Step 3 — RW */}
            {currentStep.field === "rw" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={labelStyle}>RW (Rukun Warga)</Label>
                <Select
                  value={formData.rw}
                  onValueChange={(v) => updateField("rw", v ?? "")}
                >
                  <SelectTrigger
                    className="h-12 w-full rounded-xl text-sm px-3"
                    style={inputStyle}
                  >
                    <SelectValue placeholder="Pilih nomor RW..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl p-2" style={selectPopupStyle}>
                    {RW_OPTIONS.map((rw) => (
                      <SelectItem key={rw} value={rw} className="rounded-xl px-3 py-2.5 text-sm" style={{ color: "#d9f0df" }}>
                        RW {rw}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.rw && <p className="text-xs mt-1" style={errorStyle}>{errors.rw}</p>}
              </div>
            )}

            {/* Step 4 — Kategori */}
            {currentStep.field === "kategoriId" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={labelStyle}>Kategori Laporan</Label>
                <Select value={formData.kategoriId} onValueChange={(v) => updateField("kategoriId", v ?? "")}>
                  <SelectTrigger className="h-12 w-full rounded-xl text-sm px-3" style={inputStyle}>
                    <SelectValue placeholder={categoriesLoading ? "Memuat kategori..." : "Pilih kategori laporan..."} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl p-2" style={selectPopupStyle}>
                    <SelectItem value="unknown" className="rounded-xl px-3 py-2.5 text-sm" style={{ color: "#d9f0df" }}>
                      Belum Tahu
                    </SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)} className="rounded-xl px-3 py-2.5 text-sm" style={{ color: "#d9f0df" }}>
                        {category.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.kategoriId && <p className="text-xs mt-1" style={errorStyle}>{errors.kategoriId}</p>}
              </div>
            )}

            {/* Step 5 — Isi Laporan */}
            {currentStep.field === "isiLaporan" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={labelStyle}>Isi Laporan</Label>
                <Textarea
                  placeholder="Ceritakan secara detail laporan Anda. Semakin detail, semakin cepat ditangani..."
                  value={formData.isiLaporan}
                  onChange={(e) => updateField("isiLaporan", e.target.value)}
                  className="rounded-2xl min-h-[170px] resize-none text-sm placeholder:opacity-40 px-4 py-3"
                  style={inputStyle}
                  autoFocus
                  maxLength={2000}
                />
                <div className="flex justify-between text-xs mt-1">
                  {errors.isiLaporan ? (
                    <span style={errorStyle}>{errors.isiLaporan}</span>
                  ) : (
                    <span style={{ color: "rgba(168,213,181,0.5)" }}>Minimal 20 karakter</span>
                  )}
                  <span style={{ color: formData.isiLaporan.length > 1800 ? "#f0b429" : "rgba(168,213,181,0.5)" }}>
                    {formData.isiLaporan.length}/2000
                  </span>
                </div>
              </div>
            )}

            {/* Step 6 — Review */}
            {currentStep.field === "review" && (
              <div className="space-y-3">
                {[
                  { label: "Jenis Pelaporan", value: formData.isAnonymous ? "Anonim" : "Dengan Identitas", icon: ShieldCheck },
                  ...(formData.isAnonymous
                    ? []
                    : [
                        { label: "Nama", value: formData.nama, icon: User },
                        { label: "WhatsApp", value: formData.nomorWa, icon: Phone },
                      ]),
                  { label: "Kelurahan", value: formData.kelurahan, icon: MapPin },
                  { label: "RW", value: `RW ${formData.rw}`, icon: Home },
                  {
                    label: "Kategori",
                    value:
                      formData.kategoriId === "unknown"
                        ? "Belum Tahu"
                        : categories.find((item) => String(item.id) === formData.kategoriId)?.nama ?? "-",
                    icon: FileText,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
                    style={{ backgroundColor: "rgba(7,31,13,0.42)", border: "1px solid rgba(240,180,41,0.14)" }}
                  >
                    <item.icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#f0b429" }} />
                    <div>
                      <div className="text-xs" style={{ color: "rgba(168,213,181,0.6)" }}>{item.label}</div>
                      <div className="font-semibold text-sm" style={{ color: "#c8e6d0" }}>{item.value}</div>
                    </div>
                  </div>
                ))}
                <div
                  className="rounded-2xl px-4 py-3.5"
                  style={{ backgroundColor: "rgba(7,31,13,0.42)", border: "1px solid rgba(240,180,41,0.14)" }}
                >
                  <div className="flex items-center gap-2 text-xs mb-1.5" style={{ color: "rgba(168,213,181,0.6)" }}>
                    <FileText className="w-4 h-4" style={{ color: "#f0b429" }} />
                    Isi Laporan
                  </div>
                  <p className="text-sm leading-relaxed line-clamp-4" style={{ color: "#c8e6d0" }}>
                    {formData.isiLaporan}
                  </p>
                </div>
                <div
                  className="rounded-2xl px-4 py-3.5"
                  style={{ backgroundColor: "rgba(7,31,13,0.42)", border: "1px solid rgba(240,180,41,0.14)" }}
                >
                  <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: "rgba(168,213,181,0.6)" }}>
                    <Paperclip className="w-4 h-4" style={{ color: "#f0b429" }} />
                    Lampiran Bukti
                  </div>
                  <label
                    className="mb-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed px-4 py-4 text-sm font-medium"
                    style={{ borderColor: "rgba(240,180,41,0.22)", color: "#c8e6d0", backgroundColor: "rgba(240,180,41,0.05)" }}
                  >
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleAttachmentSelection}
                    />
                    Tambah Lampiran
                  </label>
                  {attachments.length === 0 ? (
                    <p className="text-xs" style={{ color: "rgba(168,213,181,0.5)" }}>
                      Opsional. Anda bisa menambahkan foto, screenshot, atau PDF pendukung.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-xl px-3 py-2"
                          style={{ backgroundColor: "rgba(240,180,41,0.06)", border: "1px solid rgba(240,180,41,0.12)" }}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold" style={{ color: "#c8e6d0" }}>{file.name}</div>
                            <div className="text-xs" style={{ color: "rgba(168,213,181,0.5)" }}>
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="rounded-full p-1"
                            style={{ color: "#f87171" }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  className="flex items-start gap-2 text-xs rounded-2xl px-4 py-3.5"
                  style={{ backgroundColor: "rgba(240,180,41,0.1)", border: "1px solid rgba(240,180,41,0.25)", color: "#f5c518" }}
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#f0b429" }} />
                  {formData.isAnonymous
                    ? "Laporan akan dikirim sebagai anonim tanpa konfirmasi WhatsApp."
                    : `Konfirmasi akan dikirim ke WhatsApp ${formData.nomorWa}`}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="mt-7 flex gap-3">
        {step > 0 && (
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={submitting}
            className="flex-1 rounded-xl h-11 text-sm font-medium"
            style={{ borderColor: "rgba(240,180,41,0.24)", color: "#c8e6d0", backgroundColor: "rgba(240,180,41,0.06)" }}
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Kembali
          </Button>
        )}

        {!isReviewStep ? (
          <Button
            onClick={handleNext}
            className="flex-1 font-bold rounded-xl h-11 text-sm"
            style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
          >
            Lanjut
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 font-bold rounded-xl h-11 text-sm"
            style={{ backgroundColor: submitting ? "#c9961e" : "#f0b429", color: "#071f0d" }}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#071f0d]/30 border-t-[#071f0d] rounded-full animate-spin" />
                Mengirim...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Kirim Pengaduan
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
