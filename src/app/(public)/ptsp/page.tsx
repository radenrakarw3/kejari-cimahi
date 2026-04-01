"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Send, User, Phone, MapPin, Home, FileText, Eye, MonitorSmartphone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KELURAHAN_CIMAHI, RW_OPTIONS } from "@/lib/kelurahan";
import { z } from "zod";

interface FormData {
  nama: string;
  nomorWa: string;
  kelurahan: string;
  rw: string;
  kategoriId: string;
  isiLaporan: string;
}

type CategoryOption = {
  id: number;
  nama: string;
  kode: string;
  warna: string;
};

const stepSchemas = [
  z.object({ nama: z.string().min(3, "Nama minimal 3 karakter") }),
  z.object({ nomorWa: z.string().regex(/^(08|628)\d{8,12}$/, "Format: 08123456789").or(z.string().length(0)) }),
  z.object({ kelurahan: z.string().min(1, "Pilih kelurahan") }),
  z.object({ rw: z.string().min(1, "Pilih RW") }),
  z.object({ kategoriId: z.string().min(1, "Pilih kategori laporan") }),
  z.object({ isiLaporan: z.string().min(20, "Minimal 20 karakter").max(2000, "Maksimal 2000 karakter") }),
];

const STEPS = [
  { title: "Nama Warga", desc: "Nama lengkap warga pelapor", icon: User },
  { title: "Nomor WhatsApp", desc: "Nomor WA warga boleh dikosongkan", icon: Phone },
  { title: "Kelurahan", desc: "Kelurahan tempat tinggal warga", icon: MapPin },
  { title: "RW", desc: "RW tempat tinggal warga", icon: Home },
  { title: "Kategori Laporan", desc: "Jenis laporan yang diajukan", icon: FileText },
  { title: "Isi Laporan", desc: "Isi laporan warga secara detail", icon: FileText },
  { title: "Review", desc: "Periksa data sebelum kirim", icon: Eye },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.3 } },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0, transition: { duration: 0.2 } }),
};

export default function PtspPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    nama: "",
    nomorWa: "",
    kelurahan: "",
    rw: "",
    kategoriId: "",
    isiLaporan: "",
  });

  const isReview = step === 6;
  const progress = (step / (STEPS.length - 1)) * 100;

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

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateStep = () => {
    if (isReview) return true;
    const keys: (keyof FormData)[] = ["nama", "nomorWa", "kelurahan", "rw", "kategoriId", "isiLaporan"];
    const key = keys[step];

    if (step === 1 && !formData.nomorWa) return true;

    const result = stepSchemas[step].safeParse({ [key]: formData[key] });
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      setErrors({ [key]: fieldErrors[key]?.[0] ?? "Input tidak valid" });
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setDirection(1);
    setStep((current) => current + 1);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep((current) => current - 1);
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
          source: "offline",
        }),
      });

      if (!res.ok) throw new Error("Gagal menyimpan");

      const { id, nomorLaporan } = await res.json();
      toast.success(`Laporan ${nomorLaporan} berhasil disimpan`);
      router.push(`/ptsp/sukses/${id}`);
    } catch {
      toast.error("Terjadi kesalahan, coba lagi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6" style={{ backgroundColor: "#071f0d" }}>
      <div className="fixed top-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />

      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-xl" style={{ color: "#a8d5b5" }}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: "#f5c518" }}>
                <MonitorSmartphone className="w-5 h-5" style={{ color: "#f0b429" }} />
                PTSP Lobby
              </h1>
              <p className="text-sm" style={{ color: "#a8d5b5" }}>
                Form input laporan untuk warga yang datang langsung
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-3xl p-6 sm:p-8"
          style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
        >
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs mb-2" style={{ color: "#a8d5b5" }}>
              <span>Langkah {step + 1} dari {STEPS.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #f0b429, #f5c518)" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          <div className="min-h-[320px] flex flex-col">
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
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl border flex items-center justify-center" style={{ backgroundColor: "rgba(240,180,41,0.12)", borderColor: "rgba(240,180,41,0.24)" }}>
                    {(() => {
                      const Icon = STEPS[step].icon;
                      return <Icon className="w-5 h-5" style={{ color: "#f0b429" }} />;
                    })()}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg" style={{ color: "#f5c518" }}>{STEPS[step].title}</h2>
                    <p className="text-sm" style={{ color: "#a8d5b5" }}>{STEPS[step].desc}</p>
                  </div>
                </div>

                {step === 0 && (
                  <div className="space-y-2">
                    <Label style={{ color: "#f0b429" }}>Nama Lengkap Warga</Label>
                    <Input value={formData.nama} onChange={(e) => updateField("nama", e.target.value)} placeholder="Nama lengkap" autoFocus className="h-12 rounded-xl" style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }} />
                    {errors.nama && <p className="text-sm text-red-400">{errors.nama}</p>}
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-2">
                    <Label style={{ color: "#f0b429" }}>Nomor WhatsApp <span style={{ color: "rgba(168,213,181,0.65)" }}>(opsional)</span></Label>
                    <Input value={formData.nomorWa} onChange={(e) => updateField("nomorWa", e.target.value)} placeholder="08123456789" type="tel" inputMode="numeric" autoFocus className="h-12 rounded-xl" style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }} />
                    {errors.nomorWa && <p className="text-sm text-red-400">{errors.nomorWa}</p>}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-2">
                    <Label style={{ color: "#f0b429" }}>Kelurahan</Label>
                    <Select value={formData.kelurahan} onValueChange={(value) => updateField("kelurahan", value ?? "")}>
                      <SelectTrigger className="h-12 rounded-xl" style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}>
                        <SelectValue placeholder="Pilih kelurahan..." />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: "#0a3d1a", borderColor: "rgba(240,180,41,0.2)" }}>
                        {KELURAHAN_CIMAHI.map((kelurahan) => (
                          <SelectItem key={kelurahan} value={kelurahan}>{kelurahan}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.kelurahan && <p className="text-sm text-red-400">{errors.kelurahan}</p>}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-2">
                    <Label style={{ color: "#f0b429" }}>RW</Label>
                    <Select value={formData.rw} onValueChange={(value) => updateField("rw", value ?? "")}>
                      <SelectTrigger className="h-12 rounded-xl" style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}>
                        <SelectValue placeholder="Pilih RW..." />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: "#0a3d1a", borderColor: "rgba(240,180,41,0.2)" }}>
                        {RW_OPTIONS.map((rw) => (
                          <SelectItem key={rw} value={rw}>RW {rw}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.rw && <p className="text-sm text-red-400">{errors.rw}</p>}
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-2">
                    <Label style={{ color: "#f0b429" }}>Kategori Laporan</Label>
                    <Select value={formData.kategoriId} onValueChange={(value) => updateField("kategoriId", value ?? "")}>
                    <SelectTrigger className="h-12 rounded-xl" style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}>
                      <SelectValue placeholder={categoriesLoading ? "Memuat kategori..." : "Pilih kategori laporan..."} />
                    </SelectTrigger>
                    <SelectContent style={{ backgroundColor: "#0a3d1a", borderColor: "rgba(240,180,41,0.2)" }}>
                      <SelectItem value="unknown">Belum Tahu</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>{category.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                    {errors.kategoriId && <p className="text-sm text-red-400">{errors.kategoriId}</p>}
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-2">
                    <Label style={{ color: "#f0b429" }}>Isi Laporan</Label>
                    <Textarea value={formData.isiLaporan} onChange={(e) => updateField("isiLaporan", e.target.value)} placeholder="Ceritakan laporan warga secara lengkap dan detail..." className="rounded-xl min-h-[160px] resize-none" maxLength={2000} autoFocus style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }} />
                    <div className="flex justify-between text-xs" style={{ color: "rgba(168,213,181,0.65)" }}>
                      {errors.isiLaporan ? <span className="text-red-400">{errors.isiLaporan}</span> : <span>Minimal 20 karakter</span>}
                      <span>{formData.isiLaporan.length}/2000</span>
                    </div>
                  </div>
                )}

                {step === 6 && (
                  <div className="space-y-2.5">
                    {[
                      { label: "Nama", value: formData.nama, icon: User },
                      { label: "WhatsApp", value: formData.nomorWa || "Tidak diisi", icon: Phone },
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
                      <div key={item.label} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(240,180,41,0.10)" }}>
                        <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: "#f0b429" }} />
                        <div>
                          <div className="text-xs" style={{ color: "rgba(168,213,181,0.65)" }}>{item.label}</div>
                          <div className="text-sm font-medium" style={{ color: "#c8e6d0" }}>{item.value}</div>
                        </div>
                      </div>
                    ))}

                    <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(240,180,41,0.10)" }}>
                      <div className="text-xs mb-1 flex items-center gap-1.5" style={{ color: "rgba(168,213,181,0.65)" }}>
                        <FileText className="w-3.5 h-3.5" style={{ color: "#f0b429" }} />
                        Isi Laporan
                      </div>
                      <p className="text-sm line-clamp-4" style={{ color: "#c8e6d0" }}>{formData.isiLaporan}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={handleBack} disabled={submitting} className="flex-1 rounded-xl h-12" style={{ borderColor: "rgba(240,180,41,0.2)", backgroundColor: "rgba(255,255,255,0.04)", color: "#c8e6d0" }}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
            )}

            {!isReview ? (
              <Button onClick={handleNext} className="flex-1 rounded-xl h-12 font-bold" style={{ backgroundColor: "#f0b429", color: "#071f0d" }}>
                Lanjut
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 rounded-xl h-12 font-bold" style={{ backgroundColor: "#f0b429", color: "#071f0d" }}>
                {submitting ? "Menyimpan..." : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Simpan Laporan
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
