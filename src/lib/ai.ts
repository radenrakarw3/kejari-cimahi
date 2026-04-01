import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "./db";
import { aiKnowledgeEntries } from "./schema";
import { desc, eq } from "drizzle-orm";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface KnowledgeMatch {
  id: number;
  title: string;
  content: string;
  tags: string | null;
  score: number;
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

async function findRelevantKnowledge(query: string, limit = 3): Promise<KnowledgeMatch[]> {
  const entries = await db
    .select()
    .from(aiKnowledgeEntries)
    .where(eq(aiKnowledgeEntries.isActive, true))
    .orderBy(desc(aiKnowledgeEntries.updatedAt));

  const queryTokens = tokenize(query);

  const scored = entries
    .map((entry) => {
      const haystack = `${entry.title} ${entry.content} ${entry.tags ?? ""}`.toLowerCase();
      let score = 0;

      for (const token of queryTokens) {
        if (haystack.includes(token)) {
          score += 1;
        }
      }

      if (entry.title.toLowerCase().includes(query.toLowerCase())) {
        score += 3;
      }

      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

function buildKnowledgeContext(entries: KnowledgeMatch[]) {
  if (entries.length === 0) {
    return `Tidak ada bank data admin yang relevan ditemukan untuk pertanyaan ini.
Jika informasi tidak tersedia, arahkan warga dengan sopan untuk menunggu petugas/admin tanpa mengarang jawaban.`;
  }

  return entries
    .map(
      (entry, index) =>
        `Referensi ${index + 1}
Judul: ${entry.title}
Tags: ${entry.tags ?? "-"}
Isi: ${entry.content}`
    )
    .join("\n\n");
}

export interface CategorizeResult {
  kategori: string;
  confidence: number;
  alasan: string;
  bidangSaran: string;
}

export interface IntakeAssessment {
  needsClarification: boolean;
  confidence: number;
  kategori: string;
  reason: string;
}

export async function categorizeReport(
  isiLaporan: string
): Promise<CategorizeResult> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Kamu adalah sistem kategorisasi laporan untuk SAHATE KEJARI CIMAHI (Sahabat Hukum Terpadu Kejaksaan Negeri Cimahi), Indonesia.

Laporan dari masyarakat:
"${isiLaporan}"

Kategorikan laporan ini ke salah satu kategori berikut:
- KORUPSI: Tindak Pidana Korupsi, gratifikasi, suap, penggelapan uang negara
- NARKOTIKA: Narkoba, psikotropika, obat terlarang
- PIDANA_UMUM: Pencurian, penipuan, penganiayaan, perampokan, kejahatan umum
- PERDATA: Sengketa sipil, kontrak, properti, waris
- KETENAGAKERJAAN: PHK, upah tidak dibayar, pelanggaran hak kerja
- LINGKUNGAN: Pencemaran, perusakan lingkungan, limbah ilegal
- KONSULTASI: Pertanyaan hukum umum, konsultasi
- LAINNYA: Tidak masuk kategori di atas

Bidang penanganan:
- KORUPSI, NARKOTIKA → PIDSUS (Tindak Pidana Khusus)
- PIDANA_UMUM → PIDUM (Tindak Pidana Umum)
- PERDATA, KETENAGAKERJAAN → DATUN (Perdata & TUN)
- LINGKUNGAN → INTEL (Intelijen)
- KONSULTASI, LAINNYA → PBIN (Pembinaan)

Balas HANYA dalam format JSON valid berikut (tanpa teks lain):
{
  "kategori": "KODE_KATEGORI",
  "confidence": 0.95,
  "alasan": "penjelasan singkat 1 kalimat mengapa laporan ini masuk kategori tersebut",
  "bidangSaran": "KODE_BIDANG"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON from response (handle cases with extra text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]) as CategorizeResult;
    return parsed;
  } catch {
    return {
      kategori: "LAINNYA",
      confidence: 0.5,
      alasan: "Tidak dapat dikategorikan secara otomatis",
      bidangSaran: "PBIN",
    };
  }
}

export async function generateWaReply(
  kategori: string,
  isiLaporan: string,
  style: "singkat" | "menengah" | "formal" = "menengah"
): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const styleGuide = {
    singkat: "Sangat ringkas, maksimal 200 karakter",
    menengah: "Jelas dan informatif, maksimal 500 karakter",
    formal: "Formal resmi pemerintah, maksimal 800 karakter",
  };

  const prompt = `Kamu adalah asisten administrasi SAHATE KEJARI CIMAHI.

Laporan yang diterima:
Kategori: ${kategori}
Isi: "${isiLaporan}"

Buat 3 template balasan WhatsApp untuk laporan ini. Setiap template harus:
- Dalam Bahasa Indonesia
- Sopan dan profesional tapi tetap ramah
- TANPA format markdown (tidak ada *bold*, _italic_)
- Ganti [NAMA] dengan nama pelapor, [NOMOR] dengan nomor laporan

Ketiga template:
1. Singkat (maks 200 karakter)
2. Menengah (maks 500 karakter)
3. Formal resmi (maks 800 karakter)

Balas HANYA dalam format JSON:
{
  "templates": [
    "template singkat...",
    "template menengah...",
    "template formal..."
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");

    const parsed = JSON.parse(jsonMatch[0]) as { templates: string[] };
    return parsed.templates ?? [];
  } catch {
    return [
      "Terima kasih, laporan Anda di SAHATE Kejari Cimahi dengan nomor [NOMOR] segera kami proses.",
      "Halo [NAMA], laporan Anda dengan nomor [NOMOR] telah kami terima melalui SAHATE Kejari Cimahi dan akan segera diproses. Terima kasih.",
      "Assalamualaikum Wr. Wb.\n\nKepada Yth. [NAMA],\n\nLaporan Anda nomor [NOMOR] telah kami terima melalui SAHATE Kejari Cimahi dan akan diproses sesuai prosedur yang berlaku.\n\nTerima kasih.\nSAHATE Kejari Cimahi",
    ];
  }
}

export async function generateWebhookReply(params: {
  message: string;
  nomorLaporan?: string;
  isExistingReport: boolean;
}): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const { message, nomorLaporan, isExistingReport } = params;
  const knowledgeEntries = await findRelevantKnowledge(message);
  const knowledgeContext = buildKnowledgeContext(knowledgeEntries);

  const reportContext = isExistingReport
    ? `Pengirim sudah memiliki laporan aktif${nomorLaporan ? ` dengan nomor ${nomorLaporan}` : ""}.`
    : `Ini adalah tahapan akhir intake warga dan laporan baru${nomorLaporan ? ` sudah dibuat dengan nomor ${nomorLaporan}` : ""}.`;

  const prompt = `Kamu adalah admin frontdesk WhatsApp SAHATE KEJARI CIMAHI yang membalas warga seperti petugas admin yang hangat, sigap, dan enak diajak bicara.

Konteks:
- ${reportContext}
- Pesan warga: "${message}"
- Bank data admin yang boleh dijadikan rujukan:
${knowledgeContext}

Aturan:
- Jawab dalam Bahasa Indonesia.
- Nada ramah, profesional, humanis, terasa seperti chat dengan admin sungguhan.
- Tulis senatural mungkin, jangan terdengar seperti template robot.
- Jangan membuat janji hasil hukum atau keputusan resmi.
- Jika ini laporan baru, konfirmasi bahwa laporan sudah diterima dan sebut nomor laporan jika tersedia.
- Jika ini follow-up laporan aktif, akui pesan tambahan warga dan sampaikan bahwa informasi ditambahkan ke laporan berjalan.
- Jika warga tampak bertanya informasi umum, utamakan isi bank data admin di atas.
- Jangan mengarang informasi di luar bank data admin. Jika data tidak tersedia, katakan dengan jujur bahwa admin akan membantu menindaklanjuti.
- Jangan gunakan markdown.
- Maksimal 500 karakter.
- Bila cocok, gunakan ungkapan ringan yang hangat seperti "baik", "siap", "terima kasih sudah menyampaikan", atau "kami bantu cek ya", tapi jangan berlebihan.

Balas hanya isi pesan final tanpa pembuka tambahan sistem.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    if (isExistingReport) {
      return nomorLaporan
        ? `Terima kasih, informasi tambahan Anda sudah kami catat pada laporan ${nomorLaporan}. Tim kami akan menindaklanjuti dan menghubungi Anda bila diperlukan.`
        : "Terima kasih, informasi tambahan Anda sudah kami catat pada laporan yang sedang berjalan. Tim kami akan menindaklanjuti dan menghubungi Anda bila diperlukan.";
    }

    return nomorLaporan
      ? `Terima kasih, laporan Anda sudah kami terima dengan nomor ${nomorLaporan}. Tim SAHATE Kejari Cimahi akan meninjau laporan Anda dan menghubungi Anda bila diperlukan informasi tambahan.`
      : "Terima kasih, laporan Anda sudah kami terima. Tim SAHATE Kejari Cimahi akan meninjau laporan Anda dan menghubungi Anda bila diperlukan informasi tambahan.";
  }
}

export async function assessReportIntake(message: string): Promise<IntakeAssessment> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Kamu menilai apakah uraian pengaduan warga sudah cukup jelas untuk dibuatkan laporan awal.

Uraian warga:
"${message}"

Aturan penilaian:
- needsClarification = true jika isi masih terlalu umum, terlalu pendek, belum jelas peristiwanya, belum jelas masalah hukumnya, atau kategorinya masih kabur.
- needsClarification = false jika inti masalah, kejadian, atau kebutuhan hukumnya sudah cukup dipahami untuk pencatatan awal.
- confidence diisi 0 sampai 1.
- kategori pilih salah satu: KORUPSI, NARKOTIKA, PIDANA_UMUM, PERDATA, KETENAGAKERJAAN, LINGKUNGAN, KONSULTASI, LAINNYA.
- reason jelaskan singkat.

Balas hanya JSON valid:
{
  "needsClarification": true,
  "confidence": 0.62,
  "kategori": "LAINNYA",
  "reason": "uraian masih terlalu umum dan belum menjelaskan pokok kejadian"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    const parsed = JSON.parse(jsonMatch[0]) as IntakeAssessment;
    return parsed;
  } catch {
    const shortMessage = message.trim().length < 35;
    return {
      needsClarification: shortMessage,
      confidence: shortMessage ? 0.45 : 0.7,
      kategori: "LAINNYA",
      reason: shortMessage
        ? "uraian masih terlalu singkat untuk dipahami dengan baik"
        : "penilaian otomatis tidak tersedia",
    };
  }
}

export async function generateClarifyingQuestion(params: {
  nama?: string;
  kelurahan?: string;
  rw?: string;
  draftMessage: string;
  previousReason?: string;
}): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const knowledgeEntries = await findRelevantKnowledge(params.draftMessage, 3);
  const knowledgeContext = buildKnowledgeContext(knowledgeEntries);

  const prompt = `Kamu adalah admin WhatsApp SAHATE KEJARI CIMAHI.

Data warga sementara:
- Nama: ${params.nama ?? "-"}
- Kelurahan: ${params.kelurahan ?? "-"}
- RW: ${params.rw ?? "-"}
- Uraian warga saat ini: "${params.draftMessage}"
- Catatan kenapa perlu diperdalam: "${params.previousReason ?? "uraian masih belum cukup jelas"}"

Referensi bank data admin:
${knowledgeContext}

Tugas:
- Buat satu balasan WhatsApp yang hangat dan sangat natural seperti admin manusia.
- Akui dulu informasi awal warga dengan singkat.
- Lalu gali satu atau dua detail yang paling penting agar laporan lebih jelas.
- Jangan langsung kasih nomor laporan.
- Jangan pakai markdown.
- Maksimal 420 karakter.
- Hindari daftar terlalu panjang.

Balas hanya isi pesan final.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return "Baik, terima kasih sudah menyampaikan. Supaya laporan Bapak/Ibu tercatat dengan lebih tepat, boleh dijelaskan sedikit lagi inti kejadiannya, kapan terjadi, dan siapa pihak yang terlibat atau diketahui?";
  }
}

export async function answerLegalQuestion(question: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const knowledgeEntries = await findRelevantKnowledge(question, 4);
  const knowledgeContext = buildKnowledgeContext(knowledgeEntries);

  const prompt = `Kamu adalah asisten informasi SAHATE KEJARI CIMAHI.

Bank data admin yang boleh dijadikan rujukan:
${knowledgeContext}

Pertanyaan: "${question}"

Aturan:
- Jawab dengan singkat, jelas, humanis, dan dalam Bahasa Indonesia.
- Utamakan hanya informasi dari bank data admin.
- Jika bank data tidak cukup, katakan dengan jujur bahwa admin akan membantu memberi informasi resmi lebih lanjut.
- Jangan mengarang detail.
- Maksimal 350 karakter.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return "Untuk informasi lebih lanjut, silakan hubungi atau datang langsung ke SAHATE Kejari Cimahi pada hari kerja Senin-Jumat, pukul 07:30-16:00 WIB.";
  }
}
