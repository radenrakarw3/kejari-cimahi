import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "./db";
import { aiKnowledgeEntries } from "./schema";
import { desc, eq, sql } from "drizzle-orm";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const GENERATE_MODEL_CANDIDATES = [
  process.env.GEMINI_TEXT_MODEL,
  "gemini-2.5-flash-lite",
].filter((value): value is string => Boolean(value));

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

export async function findRelevantKnowledge(query: string, limit = 3): Promise<KnowledgeMatch[]> {
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

function isReportIntent(message: string): boolean {
  const normalized = message.toLowerCase();
  return [
    "lapor",
    "laporan",
    "pengaduan",
    "aduan",
    "melapor",
    "buat laporan",
    "mau lapor",
    "ingin lapor",
    "saya mau lapor",
  ].some((keyword) => normalized.includes(keyword));
}

export async function answerWhatsAppFromKnowledge(params: {
  message: string;
  history: Array<{ role: "user" | "admin"; content: string }>;
  appUrl?: string;
}): Promise<{
  reply: string;
  usedKnowledge: boolean;
  routeToReportForm: boolean;
}> {
  const { message, history, appUrl } = params;
  const normalizedAppUrl = (appUrl ?? "http://localhost:3000").replace(/\/$/, "");

  if (isReportIntent(message)) {
    return {
      reply: `Tentu, kalau Bapak/Ibu ingin membuat laporan resmi silakan langsung isi melalui link ini ya: ${normalizedAppUrl}/lapor. Setelah dikirim, tim kami akan menindaklanjuti sesuai alur yang berlaku.`,
      usedKnowledge: false,
      routeToReportForm: true,
    };
  }

  let knowledgeEntries: KnowledgeMatch[] = [];

  try {
    knowledgeEntries = await findRelevantKnowledge(message, 4);
  } catch (err) {
    console.error("[answerWhatsAppFromKnowledge] findRelevantKnowledge error:", err);
  }

  if (knowledgeEntries.length === 0) {
    return {
      reply:
        "Terima kasih, pesan Bapak/Ibu sudah kami terima. Untuk memastikan informasinya tepat, pertanyaan ini akan kami bantu cek lebih lanjut oleh admin. Jika Bapak/Ibu ingin membuat laporan resmi, silakan isi melalui link ini ya: " +
        `${normalizedAppUrl}/lapor`,
      usedKnowledge: false,
      routeToReportForm: false,
    };
  }

  const historyText =
    history.length === 0
      ? "(belum ada riwayat)"
      : history
          .map((item) => `[${item.role === "user" ? "Warga" : "Admin"}]: ${item.content}`)
          .join("\n");

  const knowledgeContext = buildKnowledgeContext(knowledgeEntries);
  const prompt = `Kamu adalah admin WhatsApp SAHATE Kejaksaan Negeri Cimahi.

Balas warga dengan gaya yang hangat, sopan, natural, dan humanis. Jangan terdengar seperti bot, jangan mengaku AI, dan jangan menggunakan markdown.

ATURAN UTAMA:
1. Jawaban hanya boleh berdasarkan BANK DATA ADMIN di bawah ini.
2. Jangan menambah fakta baru yang tidak ada di referensi.
3. Jika referensi tidak cukup untuk menjawab lengkap, sampaikan dengan sopan bahwa admin akan membantu mengecek lebih lanjut.
4. Jika warga terlihat ingin tahu prosedur laporan, arahkan dengan lembut ke link ini: ${normalizedAppUrl}/lapor
5. Maksimal 500 karakter.

RIWAYAT CHAT:
${historyText}

PESAN BARU WARGA:
"${message}"

BANK DATA ADMIN:
${knowledgeContext}

Balas hanya isi pesan jawaban akhir.`;

  for (const modelName of GENERATE_MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const reply = result.response.text().trim().replace(/\*\*/g, "");

      if (!reply) {
        throw new Error(`Empty AI reply from ${modelName}`);
      }

      return {
        reply,
        usedKnowledge: true,
        routeToReportForm: false,
      };
    } catch (err) {
      console.error(`[answerWhatsAppFromKnowledge] AI error (${modelName}):`, err);
    }
  }

  const fallback = knowledgeEntries[0];
  const summary = fallback.content.length > 320
    ? `${fallback.content.slice(0, 320)}...`
    : fallback.content;

  return {
    reply: `Baik, saya bantu sampaikan informasinya ya. ${summary}`,
    usedKnowledge: true,
    routeToReportForm: false,
  };
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

  let knowledgeContext = buildKnowledgeContext([]);
  try {
    const knowledgeEntries = await findRelevantKnowledge(message, 4);
    knowledgeContext = buildKnowledgeContext(knowledgeEntries);
  } catch (err) {
    console.error("[processConversation] findRelevantKnowledge error:", err);
  }

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
