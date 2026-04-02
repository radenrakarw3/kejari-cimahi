"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Scale,
  Pill,
  Shield,
  FileText,
  Briefcase,
  Leaf,
  MessageCircle,
  MoreHorizontal,
  MessageSquare,
  Building2,
  CheckCircle,
  ArrowRight,
  Clock,
  Phone,
  Package,
  School,
  LayoutGrid,
  HeartHandshake,
  BookOpen,
  Users,
  UserCheck,
  Info,
  TicketSlash,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  { icon: Scale, label: "Tindak Pidana Korupsi", desc: "Gratifikasi, suap, penggelapan", warna: "#f87171" },
  { icon: Pill, label: "Narkotika & Psikotropika", desc: "Narkoba & obat terlarang", warna: "#c084fc" },
  { icon: Shield, label: "Tindak Pidana Umum", desc: "Pencurian, penipuan, dll", warna: "#fb923c" },
  { icon: FileText, label: "Perdata & Sipil", desc: "Sengketa kontrak & properti", warna: "#60a5fa" },
  { icon: Briefcase, label: "Ketenagakerjaan", desc: "PHK & pelanggaran hak kerja", warna: "#4ade80" },
  { icon: Leaf, label: "Lingkungan Hidup", desc: "Pencemaran & kerusakan alam", warna: "#86efac" },
  { icon: MessageCircle, label: "Konsultasi Hukum", desc: "Pertanyaan hukum umum", warna: "#f0b429" },
  { icon: MoreHorizontal, label: "Lainnya", desc: "Kategori lain", warna: "#a8d5b5" },
];

const steps = [
  { no: "01", title: "Isi Formulir", desc: "Isi data diri dan uraian laporan secara bertahap", icon: FileText },
  { no: "02", title: "Pilih Kategori", desc: "Pilih kategori laporan yang paling sesuai", icon: CheckCircle },
  { no: "03", title: "Konfirmasi WA", desc: "Nomor laporan terkirim ke WhatsApp Anda", icon: MessageSquare },
  { no: "04", title: "Ditindaklanjuti", desc: "Tim SAHATE Kejari Cimahi memproses laporan Anda", icon: Building2 },
];

const layanan = [
  { icon: Package, label: "Layanan Baros", desc: "Pengantaran Barang Bukti Bebas Ongkos" },
  { icon: School, label: "Jaksa Masuk Sekolah", desc: "Edukasi hukum ke sekolah-sekolah" },
  { icon: LayoutGrid, label: "Pelayanan Terpadu Satu Pintu", desc: "Satu pintu untuk semua layanan" },
  { icon: HeartHandshake, label: "Sapa JPN", desc: "Layanan pendekatan jaksa ke masyarakat" },
  { icon: BookOpen, label: "Konsultasi Hukum Gratis", desc: "Konsultasi hukum tanpa biaya" },
  { icon: Shield, label: "Layanan Pidana Umum", desc: "Penanganan perkara pidana umum" },
  { icon: UserCheck, label: "Pelayanan Saksi", desc: "Perlindungan dan pelayanan saksi" },
  { icon: Users, label: "Layanan Kaum Rentan", desc: "Pelayanan khusus kelompok rentan" },
  { icon: Info, label: "Informasi Publik", desc: "Keterbukaan informasi publik" },
  { icon: TicketSlash, label: "Layanan Tilang", desc: "Pelayanan penyelesaian tilang" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#071f0d", color: "#c8e6d0" }}>
      {/* Top gold stripe */}
      <div className="h-1.5" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 shadow-lg" style={{ backgroundColor: "#0a3d1a", borderBottom: "1px solid rgba(240,180,41,0.15)" }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center p-0.5 shadow"
              style={{ backgroundColor: "rgba(240,180,41,0.15)", border: "1px solid rgba(240,180,41,0.4)" }}
            >
              <Image
                src="/logo-kejari.svg"
                alt="Logo SAHATE Kejari Cimahi"
                width={32}
                height={32}
                className="object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <div>
              <div className="font-bold text-sm leading-none" style={{ color: "#f0b429" }}>SAHATE Kejari Cimahi</div>
              <div className="text-[10px] leading-none mt-0.5 font-medium" style={{ color: "#a8d5b5" }}>
                Mudah, Cepat, dan Terintegrasi
              </div>
            </div>
          </div>
          <Link href="/lapor">
            <Button
              size="sm"
              className="font-bold rounded text-sm px-5"
              style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
            >
              Akses Layanan
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative overflow-hidden py-20 px-4"
        style={{ background: "linear-gradient(135deg, #071f0d 0%, #0d4d22 60%, #0a3d1a 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #f0b429 0, #f0b429 1px, transparent 0, transparent 50%)`,
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full opacity-[0.07]" style={{ backgroundColor: "#f0b429" }} />
        <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full opacity-[0.07]" style={{ backgroundColor: "#f0b429" }} />

        <motion.div
          className="relative max-w-4xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 text-center lg:text-left">
              <motion.div variants={fadeUp} className="mb-4">
                <span
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wide"
                  style={{ backgroundColor: "rgba(240,180,41,0.15)", color: "#f5c518", border: "1px solid rgba(240,180,41,0.3)" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#4ade80" }} />
                  Sistem Aktif 24 Jam
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4"
                style={{ color: "#f5c518" }}
              >
                SAHATE{" "}
                <span style={{ color: "#c8e6d0" }}>Kejari Cimahi</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-base mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0" style={{ color: "#a8d5b5" }}>
                Sahabat Hukum Terpadu Kejaksaan Negeri Cimahi. Platform layanan hukum digital yang hadir sepenuh hati untuk pengaduan masyarakat, konsultasi, edukasi hukum, dan helpdesk terintegrasi WhatsApp.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/lapor">
                  <Button
                    size="lg"
                    className="font-bold rounded px-8 h-12 text-sm w-full sm:w-auto"
                    style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Buat Pengaduan via Web
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  className="font-semibold rounded px-8 h-12 text-sm w-full sm:w-auto"
                  style={{ borderColor: "rgba(240,180,41,0.4)", color: "#f0b429", backgroundColor: "transparent" }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Konsultasi via WhatsApp
                </Button>
              </motion.div>

              <motion.div variants={fadeUp} className="flex items-center gap-5 mt-8 justify-center lg:justify-start">
                {[
                  { icon: Clock, text: "Respons Cepat" },
                  { icon: CheckCircle, text: "Transparan" },
                  { icon: MessageSquare, text: "Terintegrasi WA" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-1.5 text-xs" style={{ color: "#a8d5b5" }}>
                    <item.icon className="w-3.5 h-3.5" style={{ color: "#f0b429" }} />
                    {item.text}
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div variants={fadeUp} className="flex-shrink-0 hidden lg:block">
              <div
                className="w-48 h-48 rounded-full flex items-center justify-center shadow-2xl p-4"
                style={{ backgroundColor: "rgba(240,180,41,0.08)", border: "2px solid rgba(240,180,41,0.25)" }}
              >
                <Image
                  src="/logo-kejari.svg"
                  alt="Logo SAHATE Kejari Cimahi"
                  width={152}
                  height={152}
                  className="object-contain drop-shadow-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4" style={{ backgroundColor: "#0a3d1a" }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.div variants={fadeUp}>
              <span
                className="inline-block px-3 py-1 rounded text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ backgroundColor: "rgba(240,180,41,0.15)", color: "#f0b429", border: "1px solid rgba(240,180,41,0.25)" }}
              >
                Cara Melapor
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "#f5c518" }}>
              Proses Laporan yang Mudah & Terstruktur
            </motion.h2>
            <motion.p variants={fadeUp} className="max-w-xl mx-auto text-sm" style={{ color: "#a8d5b5" }}>
              Ikuti 4 langkah sederhana untuk menyampaikan kebutuhan layanan Anda melalui SAHATE Kejari Cimahi
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {steps.map((step, i) => (
              <motion.div key={step.no} variants={fadeUp} className="relative">
                <div
                  className="h-full rounded-xl p-5 transition-all duration-200 hover:scale-[1.02]"
                  style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.18)" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 font-black text-lg"
                    style={{ backgroundColor: "rgba(240,180,41,0.15)", color: "#f0b429" }}
                  >
                    {step.no}
                  </div>
                  <step.icon className="w-5 h-5 mb-3" style={{ color: "#f0b429" }} />
                  <h3 className="font-bold mb-1.5 text-sm" style={{ color: "#f5c518" }}>{step.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#a8d5b5" }}>{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight
                    className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10"
                    style={{ color: "rgba(240,180,41,0.4)" }}
                  />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4" style={{ backgroundColor: "#071f0d" }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.div variants={fadeUp}>
              <span
                className="inline-block px-3 py-1 rounded text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ backgroundColor: "rgba(240,180,41,0.15)", color: "#f0b429", border: "1px solid rgba(240,180,41,0.25)" }}
              >
                Kategori Laporan
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "#f5c518" }}>
              Jenis Laporan yang Diterima
            </motion.h2>
            <motion.p variants={fadeUp} className="max-w-xl mx-auto text-sm" style={{ color: "#a8d5b5" }}>
              Pilih kategori yang paling sesuai agar laporan Anda langsung masuk ke alur penanganan yang tepat
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
          >
            {categories.map((cat) => (
              <motion.div key={cat.label} variants={fadeUp}>
                <div
                  className="rounded-xl p-4 hover:scale-[1.02] transition-all duration-200 cursor-default"
                  style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: cat.warna + "20" }}
                  >
                    <cat.icon className="w-5 h-5" style={{ color: cat.warna }} />
                  </div>
                  <div className="font-semibold text-xs mb-1 leading-snug" style={{ color: "#f5c518" }}>{cat.label}</div>
                  <div className="text-[11px] leading-snug" style={{ color: "#a8d5b5" }}>{cat.desc}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* About Kejari */}
      <section className="py-16 px-4" style={{ backgroundColor: "#0a3d1a" }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.2)" }}
            >
              <div className="h-1.5" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518)" }} />
              <div className="p-8 sm:p-10">
                <div className="flex flex-col sm:flex-row gap-8 items-start">
                  <div className="flex-shrink-0 text-center sm:text-left">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto sm:mx-0 p-1.5"
                      style={{ backgroundColor: "rgba(240,180,41,0.12)", border: "2px solid rgba(240,180,41,0.3)" }}
                    >
                      <Image
                        src="/logo-kejari.svg"
                        alt="Logo Kejari"
                        width={64}
                        height={64}
                        className="object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <motion.div variants={fadeUp}>
                      <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{ color: "#f5c518" }}>
                        Kejaksaan Negeri Kota Cimahi
                      </h2>
                      <p className="text-sm font-semibold mb-4" style={{ color: "#f0b429" }}>
                        Satya Adhi Wicaksana
                      </p>
                      <p className="text-sm leading-relaxed mb-5" style={{ color: "#a8d5b5" }}>
                        Kejaksaan Negeri Cimahi adalah instansi penegak hukum di wilayah Kota Cimahi
                        yang bertugas melaksanakan kekuasaan negara di bidang penuntutan serta
                        kewenangan lain berdasarkan undang-undang yang berlaku.
                      </p>
                    </motion.div>
                    <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-2">
                      {[
                        "Seksi Pembinaan",
                        "Seksi Intelijen",
                        "Seksi Tindak Pidana Umum",
                        "Seksi Tindak Pidana Khusus",
                        "Seksi Perdata dan Tata Usaha Negara",
                        "Seksi Pemulihan Aset dan Pengelolaan Barang Bukti",
                      ].map((b) => (
                        <div key={b} className="flex items-center gap-2 text-sm" style={{ color: "#c8e6d0" }}>
                          <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#f0b429" }} />
                          {b}
                        </div>
                      ))}
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Layanan Kami */}
      <section className="py-16 px-4" style={{ backgroundColor: "#0d4d22" }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-12"
          >
            <motion.div variants={fadeUp}>
              <span
                className="inline-block px-3 py-1 rounded text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ backgroundColor: "rgba(240,180,41,0.15)", color: "#f0b429", border: "1px solid rgba(240,180,41,0.25)" }}
              >
                Layanan Kami
              </span>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "#f5c518" }}>
              Layanan Kejaksaan Negeri Cimahi
            </motion.h2>
            <motion.p variants={fadeUp} className="max-w-xl mx-auto text-sm" style={{ color: "#a8d5b5" }}>
              Berbagai layanan publik yang tersedia untuk masyarakat Kota Cimahi
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
          >
            {layanan.map((item) => (
              <motion.div key={item.label} variants={fadeUp}>
                <div
                  className="rounded-xl p-4 h-full transition-all duration-200 hover:scale-[1.02]"
                  style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.15)" }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: "rgba(240,180,41,0.12)" }}
                  >
                    <item.icon className="w-4 h-4" style={{ color: "#f0b429" }} />
                  </div>
                  <div className="font-semibold text-xs mb-1 leading-snug" style={{ color: "#f5c518" }}>{item.label}</div>
                  <div className="text-[11px] leading-snug" style={{ color: "#a8d5b5" }}>{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-14 px-4 relative overflow-hidden" style={{ backgroundColor: "#0d4d22" }}>
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #f0b429 0, #f0b429 1px, transparent 0, transparent 20px)`,
            backgroundSize: "20px 20px",
          }}
        />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="relative max-w-3xl mx-auto text-center"
        >
          <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: "#f5c518" }}>
            Siap Menyampaikan Laporan?
          </motion.h2>
          <motion.p variants={fadeUp} className="mb-7 text-sm" style={{ color: "#a8d5b5" }}>
            Laporan Anda adalah kontribusi nyata untuk mewujudkan penegakan hukum yang adil di Kota Cimahi.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link href="/lapor">
              <Button
                size="lg"
                className="font-bold rounded px-10 h-12 shadow-lg"
                style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
              >
                Mulai Laporan Sekarang
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4" style={{ backgroundColor: "#071f0d", borderTop: "1px solid rgba(240,180,41,0.12)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-8 justify-between mb-8">
            {/* Brand */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center p-0.5"
                  style={{ backgroundColor: "rgba(240,180,41,0.12)", border: "1px solid rgba(240,180,41,0.3)" }}
                >
                  <Image src="/logo-kejari.svg" alt="Logo" width={28} height={28} className="object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div>
                  <div className="font-bold text-sm leading-none" style={{ color: "#f0b429" }}>Kejaksaan Negeri Cimahi</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#a8d5b5" }}>Satya Adhi Wicaksana</div>
                </div>
              </div>
              <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(168,213,181,0.5)" }}>
                Portal khusus pelayanan publik dan laporan masyarakat. Untuk informasi resmi Kejari Cimahi, kunjungi website resmi kami.
              </p>
              <a
                href="https://kejari-cimahi.kejaksaan.go.id"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ color: "#f0b429" }}
              >
                <Globe className="w-3.5 h-3.5" />
                Website Resmi Kejari Cimahi ↗
              </a>
            </div>

            {/* Kontak */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#f0b429" }}>Hubungi Kami</div>
              <div className="space-y-2">
                <a href="tel:085155409070" className="flex items-center gap-2 text-xs transition-colors hover:opacity-80" style={{ color: "#a8d5b5" }}>
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#f0b429" }} />
                  085155409070
                </a>
                <a href="https://kejari-cimahi.kejaksaan.go.id" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs transition-colors hover:opacity-80" style={{ color: "#a8d5b5" }}>
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#f0b429" }} />
                  Website Resmi Kejari Cimahi
                </a>
                <a href="https://instagram.com/kejari_cimahi" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs transition-colors hover:opacity-80" style={{ color: "#a8d5b5" }}>
                  <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#f0b429" }} />
                  @kejari_cimahi
                </a>
              </div>
            </div>
          </div>

          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-2" style={{ borderTop: "1px solid rgba(240,180,41,0.1)" }}>
            <div className="text-xs" style={{ color: "rgba(168,213,181,0.4)" }}>© 2025 Kejaksaan Negeri Cimahi. Hak cipta dilindungi.</div>
            <div className="text-xs" style={{ color: "rgba(168,213,181,0.3)" }}>Sistem Laporan Masyarakat Digital</div>
          </div>
        </div>
      </footer>
    </main>
  );
}
