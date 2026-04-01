"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Send, User, Phone, MapPin, Home, FileText, Eye, Laptop } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { KELURAHAN_CIMAHI, RW_OPTIONS } from "@/lib/kelurahan";
import { z } from "zod";

interface FormData {
  nama: string;
  nomorWa: string;
  kelurahan: string;
  rw: string;
  isiLaporan: string;
}

const stepSchemas = [
  z.object({ nama: z.string().min(3, "Nama minimal 3 karakter") }),
  z.object({ nomorWa: z.string().regex(/^(08|628)\d{8,12}$/, "Format: 08123456789").or(z.string().length(0)) }),
  z.object({ kelurahan: z.string().min(1, "Pilih kelurahan") }),
  z.object({ rw: z.string().min(1, "Pilih RW") }),
  z.object({ isiLaporan: z.string().min(20, "Minimal 20 karakter").max(2000, "Maksimal 2000 karakter") }),
];

const STEPS = [
  { title: "Nama Warga", desc: "Nama lengkap warga pelapor", icon: User },
  { title: "Nomor WhatsApp", desc: "Nomor WA warga (opsional)", icon: Phone },
  { title: "Kelurahan", desc: "Kelurahan tempat tinggal warga", icon: MapPin },
  { title: "RW", desc: "RW tempat tinggal warga", icon: Home },
  { title: "Isi Laporan", desc: "Isi laporan warga secara detail", icon: FileText },
  { title: "Review & Simpan", desc: "Periksa data sebelum menyimpan", icon: Eye },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.3 } },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.2 } }),
};

export default function InputOfflinePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    nama: "", nomorWa: "", kelurahan: "", rw: "", isiLaporan: "",
  });

  const isReview = step === 5;
  const progress = (step / (STEPS.length - 1)) * 100;

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const validateStep = () => {
    if (isReview) return true;
    const keys: (keyof FormData)[] = ["nama", "nomorWa", "kelurahan", "rw", "isiLaporan"];
    const key = keys[step];

    // WA is optional for offline
    if (step === 1 && !formData.nomorWa) return true;

    const result = stepSchemas[step].safeParse({ [key]: formData[key] });
    if (!result.success) {
      const fe = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      setErrors({ [key]: fe[key]?.[0] ?? "Input tidak valid" });
      return false;
    }
    return true;
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
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          nomorWa: formData.nomorWa || "0000000000",
          source: "offline",
        }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      const { id, nomorLaporan } = await res.json();
      toast.success(`Laporan ${nomorLaporan} berhasil disimpan`);
      router.push(`/admin/laporan/${id}`);
    } catch {
      toast.error("Terjadi kesalahan, coba lagi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/laporan">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Laptop className="w-5 h-5 text-purple-400" />
            Input Laporan Offline
          </h1>
          <p className="text-slate-400 text-sm">Input laporan untuk warga yang datang langsung ke kantor</p>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-3xl bg-white/5 border border-white/10 p-6 sm:p-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Langkah {step + 1} dari {STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-amber-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="min-h-[280px] flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={step} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  {(() => { const I = STEPS[step].icon; return <I className="w-5 h-5 text-amber-400" />; })()}
                </div>
                <div>
                  <h2 className="font-bold text-lg">{STEPS[step].title}</h2>
                  <p className="text-slate-400 text-sm">{STEPS[step].desc}</p>
                </div>
              </div>

              {step === 0 && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Nama Lengkap Warga</Label>
                  <Input value={formData.nama} onChange={(e) => updateField("nama", e.target.value)} placeholder="Nama lengkap" onKeyDown={(e) => e.key === "Enter" && handleNext()} autoFocus className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 h-12 rounded-xl focus:border-amber-500" />
                  {errors.nama && <p className="text-red-400 text-sm">{errors.nama}</p>}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Nomor WhatsApp <span className="text-slate-500 font-normal">(opsional)</span></Label>
                  <Input value={formData.nomorWa} onChange={(e) => updateField("nomorWa", e.target.value)} placeholder="08123456789 (kosongkan jika tidak ada)" type="tel" inputMode="numeric" onKeyDown={(e) => e.key === "Enter" && handleNext()} autoFocus className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 h-12 rounded-xl focus:border-amber-500" />
                  {errors.nomorWa && <p className="text-red-400 text-sm">{errors.nomorWa}</p>}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Kelurahan</Label>
                  <Select value={formData.kelurahan} onValueChange={(v) => updateField("kelurahan", v ?? "")}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white h-12 rounded-xl"><SelectValue placeholder="Pilih kelurahan..." /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/20">
                      {KELURAHAN_CIMAHI.map((k) => (<SelectItem key={k} value={k} className="text-white focus:bg-white/10">{k}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {errors.kelurahan && <p className="text-red-400 text-sm">{errors.kelurahan}</p>}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-2">
                  <Label className="text-slate-300">RW</Label>
                  <Select value={formData.rw} onValueChange={(v) => updateField("rw", v ?? "")}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white h-12 rounded-xl"><SelectValue placeholder="Pilih RW..." /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/20">
                      {RW_OPTIONS.map((rw) => (<SelectItem key={rw} value={rw} className="text-white focus:bg-white/10">RW {rw}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {errors.rw && <p className="text-red-400 text-sm">{errors.rw}</p>}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Isi Laporan</Label>
                  <Textarea value={formData.isiLaporan} onChange={(e) => updateField("isiLaporan", e.target.value)} placeholder="Ceritakan laporan warga secara lengkap dan detail..." className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 rounded-xl min-h-[150px] resize-none" maxLength={2000} autoFocus />
                  <div className="flex justify-between text-xs text-slate-500">
                    {errors.isiLaporan ? <span className="text-red-400">{errors.isiLaporan}</span> : <span>Min. 20 karakter</span>}
                    <span>{formData.isiLaporan.length}/2000</span>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-2.5">
                  {[
                    { label: "Nama", value: formData.nama, icon: User },
                    { label: "WhatsApp", value: formData.nomorWa || "Tidak diisi", icon: Phone },
                    { label: "Kelurahan", value: formData.kelurahan, icon: MapPin },
                    { label: "RW", value: `RW ${formData.rw}`, icon: Home },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                      <item.icon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-slate-500">{item.label}</div>
                        <div className="text-sm font-medium">{item.value}</div>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" /> Isi Laporan
                    </div>
                    <p className="text-sm text-slate-200 line-clamp-3">{formData.isiLaporan}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3 text-xs text-purple-300">
                    <Laptop className="w-4 h-4 flex-shrink-0" />
                    Laporan akan disimpan dengan sumber: <strong>Offline</strong>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nav buttons */}
        <div className="mt-8 flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={handleBack} disabled={submitting} className="flex-1 border-white/20 bg-white/5 hover:bg-white/10 text-white rounded-xl h-12">
              <ArrowLeft className="w-4 h-4 mr-2" />Kembali
            </Button>
          )}
          {!isReview ? (
            <Button onClick={handleNext} className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl h-12">
              Lanjut <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl h-12">
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />Menyimpan...
                </span>
              ) : (
                <span className="flex items-center gap-2"><Send className="w-4 h-4" />Simpan Laporan</span>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
