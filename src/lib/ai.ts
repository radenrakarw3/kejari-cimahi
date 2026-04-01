import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface CategorizeResult {
  kategori: string;
  confidence: number;
  alasan: string;
  bidangSaran: string;
}

export async function categorizeReport(
  isiLaporan: string
): Promise<CategorizeResult> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Kamu adalah sistem kategorisasi laporan untuk Kejaksaan Negeri Cimahi, Indonesia.

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

  const prompt = `Kamu adalah asisten administrasi Kejaksaan Negeri Cimahi.

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
      "Terima kasih atas laporan Anda. Kami akan segera memproses laporan [NOMOR]. Salam, Kejari Cimahi.",
      "Halo [NAMA], laporan Anda dengan nomor [NOMOR] telah kami terima dan akan segera diproses. Terima kasih. Kejaksaan Negeri Cimahi.",
      "Assalamualaikum Wr. Wb.\n\nKepada Yth. [NAMA],\n\nLaporan Anda nomor [NOMOR] telah kami terima dan akan diproses sesuai prosedur yang berlaku.\n\nTerima kasih.\nKejaksaan Negeri Cimahi",
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

  const reportContext = isExistingReport
    ? `Pengirim sudah memiliki laporan aktif${nomorLaporan ? ` dengan nomor ${nomorLaporan}` : ""}.`
    : `Ini adalah pesan awal dari warga dan laporan baru${nomorLaporan ? ` sudah dibuat dengan nomor ${nomorLaporan}` : ""}.`;

  const prompt = `Kamu adalah admin frontdesk WhatsApp Kejaksaan Negeri Cimahi yang membalas warga dengan cepat dan sopan.

Konteks:
- ${reportContext}
- Pesan warga: "${message}"

Aturan:
- Jawab dalam Bahasa Indonesia.
- Nada ramah, profesional, menenangkan, dan singkat.
- Jangan membuat janji hasil hukum atau keputusan resmi.
- Jika ini laporan baru, konfirmasi bahwa laporan sudah diterima dan sebut nomor laporan jika tersedia.
- Jika ini follow-up laporan aktif, akui pesan tambahan warga dan sampaikan bahwa informasi ditambahkan ke laporan berjalan.
- Jika warga tampak bertanya informasi umum, jawab seperlunya lalu arahkan untuk menunggu petugas bila perlu.
- Jangan gunakan markdown.
- Maksimal 450 karakter.

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
      ? `Terima kasih, laporan Anda sudah kami terima dengan nomor ${nomorLaporan}. Tim Kejari Cimahi akan meninjau laporan Anda dan menghubungi Anda bila diperlukan informasi tambahan.`
      : "Terima kasih, laporan Anda sudah kami terima. Tim Kejari Cimahi akan meninjau laporan Anda dan menghubungi Anda bila diperlukan informasi tambahan.";
  }
}

export async function answerLegalQuestion(question: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Kamu adalah asisten informasi Kejaksaan Negeri Cimahi.

Pengetahuan yang kamu miliki tentang Kejari Cimahi:
- Berlokasi di Kota Cimahi, Jawa Barat
- Jam operasional: Senin-Jumat 07:30-16:00 WIB
- Bidang: Pembinaan, Intelijen, Pidana Umum, Pidana Khusus, Perdata & TUN
- Menangani perkara korupsi, pidana umum, narkotika, perdata, dan TUN
- Laporan bisa via website atau WhatsApp
- Konsultasi hukum bisa langsung ke kantor

Pertanyaan: "${question}"

Jawab dengan singkat, jelas, dan dalam Bahasa Indonesia.
Selalu akhiri dengan: "Untuk informasi resmi, silakan datang langsung ke kantor Kejaksaan Negeri Cimahi."
Maksimal 300 karakter.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return "Untuk informasi lebih lanjut, silakan datang langsung ke kantor Kejaksaan Negeri Cimahi pada hari kerja Senin-Jumat, pukul 07:30-16:00 WIB.";
  }
}
