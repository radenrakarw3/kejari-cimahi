import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "./db";
import { categories, bidang } from "./schema";

async function seed() {
  console.log("🌱 Seeding categories...");
  await db
    .insert(categories)
    .values([
      {
        nama: "Tindak Pidana Korupsi",
        kode: "KORUPSI",
        deskripsi: "Korupsi, gratifikasi, suap, penggelapan uang negara",
        warna: "#dc2626",
        icon: "Scale",
      },
      {
        nama: "Narkotika & Psikotropika",
        kode: "NARKOTIKA",
        deskripsi: "Penyalahgunaan narkoba, obat terlarang, psikotropika",
        warna: "#7c3aed",
        icon: "Pill",
      },
      {
        nama: "Tindak Pidana Umum",
        kode: "PIDANA_UMUM",
        deskripsi: "Pencurian, penipuan, penganiayaan, perampokan, dll",
        warna: "#ea580c",
        icon: "Shield",
      },
      {
        nama: "Perdata & Sipil",
        kode: "PERDATA",
        deskripsi: "Sengketa kontrak, properti, waris, perkawinan",
        warna: "#0284c7",
        icon: "FileText",
      },
      {
        nama: "Ketenagakerjaan",
        kode: "KETENAGAKERJAAN",
        deskripsi: "PHK sepihak, upah tidak dibayar, pelanggaran hak kerja",
        warna: "#16a34a",
        icon: "Briefcase",
      },
      {
        nama: "Lingkungan Hidup",
        kode: "LINGKUNGAN",
        deskripsi: "Pencemaran lingkungan, perusakan alam, limbah ilegal",
        warna: "#15803d",
        icon: "Leaf",
      },
      {
        nama: "Konsultasi Hukum",
        kode: "KONSULTASI",
        deskripsi: "Pertanyaan dan konsultasi masalah hukum umum",
        warna: "#0369a1",
        icon: "MessageCircle",
      },
      {
        nama: "Lainnya",
        kode: "LAINNYA",
        deskripsi: "Laporan yang tidak masuk kategori di atas",
        warna: "#6b7280",
        icon: "MoreHorizontal",
      },
    ])
    .onConflictDoNothing();

  console.log("🌱 Seeding bidang...");
  await db
    .insert(bidang)
    .values([
      {
        nama: "Pembinaan",
        kode: "PBIN",
        deskripsi: "Administrasi, kepegawaian, dan dukungan teknis",
      },
      {
        nama: "Intelijen",
        kode: "INTEL",
        deskripsi: "Intelijen penegakan hukum dan pengamanan pembangunan",
      },
      {
        nama: "Tindak Pidana Umum",
        kode: "PIDUM",
        deskripsi: "Penuntutan perkara pidana umum",
      },
      {
        nama: "Tindak Pidana Khusus",
        kode: "PIDSUS",
        deskripsi: "Penuntutan korupsi, narkotika, dan tindak pidana khusus",
      },
      {
        nama: "Perdata & TUN",
        kode: "DATUN",
        deskripsi: "Perkara perdata dan tata usaha negara",
      },
    ])
    .onConflictDoNothing();

  console.log("✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
