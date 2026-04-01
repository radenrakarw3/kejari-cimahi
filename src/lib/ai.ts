import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "./db";
import { aiKnowledgeEntries } from "./schema";
import { desc, eq, sql } from "drizzle-orm";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface KnowledgeMatch {
  id: number;
  title: string;
  content: string;
  tags: string | null;
  score: number;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function generateAndStoreEmbedding(entryId: number, text: string): Promise<void> {
  const embedding = await generateEmbedding(text);
  const vectorStr = `[${embedding.join(",")}]`;
  await db.execute(
    sql`UPDATE ai_knowledge_entries SET embedding = ${vectorStr}::vector WHERE id = ${entryId}`
  );
}

async function findRelevantKnowledge(query: string, limit = 3): Promise<KnowledgeMatch[]> {
  // Semantic search via vector similarity
  try {
    const queryEmbedding = await generateEmbedding(query);
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    const rows = await db.execute(sql`
      SELECT id, title, content, tags,
             1 - (embedding <=> ${vectorStr}::vector) AS score
      FROM ai_knowledge_entries
      WHERE is_active = true
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `);

    if (rows.rows.length > 0) {
      return rows.rows.map((row) => ({
        id: row.id as number,
        title: row.title as string,
        content: row.content as string,
        tags: row.tags as string | null,
        score: row.score as number,
      }));
    }
  } catch {
    // fall through to token search
  }

  // Fallback: token-based search (entries without embeddings yet)
  const entries = await db
    .select()
    .from(aiKnowledgeEntries)
    .where(eq(aiKnowledgeEntries.isActive, true))
    .orderBy(desc(aiKnowledgeEntries.updatedAt));

  const queryTokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  return entries
    .map((entry) => {
      const haystack = `${entry.title} ${entry.content} ${entry.tags ?? ""}`.toLowerCase();
      let score = queryTokens.filter((t) => haystack.includes(t)).length;
      if (entry.title.toLowerCase().includes(query.toLowerCase())) score += 3;
      return { ...entry, score };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
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
): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

export interface ConversationResult {
  reply: string;
  action: "none" | "update_fields" | "create_report" | "reset";
  fields: {
    nama?: string | null;
    kelurahan?: string | null;
    rw?: string | null;
    isiLaporan?: string | null;
  };
}

export async function processConversation(params: {
  message: string;
  history: Array<{ role: "user" | "admin"; content: string }>;
  collectedFields: {
    nama: string | null;
    kelurahan: string | null;
    rw: string | null;
    isiLaporan: string | null;
  };
  userReports: Array<{
    nomorLaporan: string;
    status: string;
    isiLaporan: string;
    createdAt: Date | null;
  }>;
  validKelurahan: string[];
  validRw: string[];
}): Promise<ConversationResult> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const { message, history, collectedFields, userReports, validKelurahan, validRw } = params;

  const knowledgeEntries = await findRelevantKnowledge(message, 4);
  const knowledgeContext = buildKnowledgeContext(knowledgeEntries);

  const historyText =
    history.length === 0
      ? "(belum ada riwayat)"
      : history
          .map((h) => `[${h.role === "user" ? "Warga" : "Admin"}]: ${h.content}`)
          .join("\n");

  const reportsText =
    userReports.length === 0
      ? "(tidak ada laporan)"
      : userReports
          .map(
            (r) =>
              `- Nomor: ${r.nomorLaporan} | Status: ${r.status} | Dibuat: ${r.createdAt ? r.createdAt.toLocaleDateString("id-ID") : "-"} | Isi: ${r.isiLaporan.slice(0, 120)}${r.isiLaporan.length > 120 ? "..." : ""}`
          )
          .join("\n");

  const prompt = `Kamu adalah staf admin WhatsApp SAHATE Kejaksaan Negeri Cimahi. Nama layanan: SAHATE Kejari Cimahi.

Balas seperti manusia nyata—hangat, natural, tidak kaku, tidak terasa seperti template bot. Jangan pernah akui kamu AI atau bot.

RIWAYAT CHAT (dari lama ke terbaru):
${historyText}

PESAN BARU DARI WARGA:
"${message}"

DATA LAPORAN WARGA INI DI SISTEM:
${reportsText}

BANK DATA ADMIN (informasi resmi yang boleh disampaikan):
${knowledgeContext}

DATA YANG SUDAH TERKUMPUL UNTUK LAPORAN:
- Nama: ${collectedFields.nama ?? "belum ada"}
- Kelurahan: ${collectedFields.kelurahan ?? "belum ada"}
- RW: ${collectedFields.rw ?? "belum ada"}
- Isi laporan: ${collectedFields.isiLaporan ?? "belum ada"}

KELURAHAN YANG VALID:
${validKelurahan.join(", ")}

NOMOR RW YANG VALID (format 2 digit):
${validRw.map((r) => "RW " + r).join(", ")}

INSTRUKSI:
1. Balas seperti admin manusia yang hangat dan sigap. Jangan terdengar seperti template atau bot.
2. Jawab pertanyaan warga dari data laporan mereka atau bank data admin. Jangan mengarang.
3. Kumpulkan 4 data ini secara natural: nama lengkap, kelurahan, nomor RW, dan isi/inti laporan. Tidak harus berurutan kaku—ikuti alur percakapan.
4. PENTING: Jika nama belum diketahui, SELALU akhiri balasan dengan menanyakan nama warga secara natural, apapun isi pesannya.
5. Jika pesan ini mengandung info baru (nama/kelurahan/rw/isi laporan), masukkan ke fields.
6. Kelurahan HARUS dari daftar valid. Jika tidak cocok, tanyakan pelan-pelan.
7. RW format 2 digit (01-14). Jika tidak valid, minta balas ulang.
8. Jika semua 4 data sudah lengkap (dari riwayat + pesan ini), set action = "create_report".
9. Jangan pernah bilang kamu AI, bot, atau sistem otomatis.
10. Jangan gunakan markdown (* _ # **).
11. Maksimal 380 karakter untuk reply.
12. Jika warga minta batal/reset/mulai ulang, set action = "reset".
13. Fields: isi hanya dengan nilai BARU dari pesan ini saja. null jika tidak ada info baru.

Balas HANYA dalam format JSON valid ini (tidak ada teks lain di luar JSON):
{
  "reply": "...",
  "action": "none",
  "fields": {
    "nama": null,
    "kelurahan": null,
    "rw": null,
    "isiLaporan": null
  }
}

action pilihan: "none", "update_fields", "create_report", "reset"`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`AI returned non-JSON: ${text.slice(0, 200)}`);

    const parsed = JSON.parse(jsonMatch[0]) as ConversationResult;
    return parsed;
  } catch (err) {
    console.error("[processConversation] AI error:", err);

    const { nama, kelurahan, rw, isiLaporan } = collectedFields;

    if (!nama) {
      return { reply: "Halo, saya bantu ya. Boleh minta nama lengkap dulu?", action: "none", fields: {} };
    }
    if (!kelurahan) {
      return { reply: `Oke ${nama}, boleh disebutkan kelurahannya di mana?`, action: "none", fields: {} };
    }
    if (!rw) {
      return { reply: `Siap, lalu nomor RW-nya berapa?`, action: "none", fields: {} };
    }
    if (!isiLaporan) {
      return { reply: `Baik, ceritakan saja inti pengaduan atau kebutuhan hukumnya ya, santai saja.`, action: "none", fields: {} };
    }

    return { reply: "Baik, ada yang bisa saya bantu lebih lanjut?", action: "none", fields: {} };
  }
}
