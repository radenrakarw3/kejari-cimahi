import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "./db";
import { aiAssistantSettings, aiKnowledgeEntries } from "./schema";
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

type PersonGender = "male" | "female" | "unknown";

interface PersonContext {
  name: string | null;
  gender: PersonGender;
  preferredGreeting: string;
}

type ToneMode = "formal" | "warm" | "calming" | "balanced";

function pickVariant<T>(message: string, options: T[]): T {
  const seed = Array.from(message).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return options[seed % options.length];
}

function buildLanguageVariationGuide(message: string) {
  const openingOptions = [
    "Baik, kami bantu jelaskan ya.",
    "Baik, izinkan kami bantu jelaskan pelan-pelan ya.",
    "Siap, kami bantu informasikan dengan sejelas mungkin ya.",
    "Tentu, kami bantu jelaskan supaya lebih mudah dipahami ya.",
  ];

  const empathyOptions = [
    "Kami memahami situasi seperti ini bisa membuat pikiran tidak tenang.",
    "Kami paham kondisi seperti ini bisa terasa berat dan membingungkan.",
    "Kami mengerti hal seperti ini bisa membuat Anda cemas.",
    "Kami memahami persoalan seperti ini sering kali membuat hati tidak tenang.",
  ];

  const transitionOptions = [
    "Jadi begini ya.",
    "Untuk gambaran awalnya seperti ini ya.",
    "Kalau mengacu pada informasi yang kami miliki, alurnya seperti ini ya.",
    "Supaya lebih jelas, penjelasannya seperti ini ya.",
  ];

  const closingOptions = [
    "Kalau masih ada yang ingin ditanyakan, silakan sampaikan ya.",
    "Jika ada bagian yang masih ingin diperjelas, kami siap bantu jelaskan lagi.",
    "Bila masih ada yang mengganjal, silakan lanjutkan pertanyaannya ya.",
    "Kalau Anda ingin, kami bisa bantu lanjutkan penjelasannya satu per satu.",
  ];

  return {
    opening: pickVariant(message, openingOptions),
    empathy: pickVariant(message, empathyOptions),
    transition: pickVariant(message, transitionOptions),
    closing: pickVariant(message, closingOptions),
  };
}

async function getAssistantToneMode(): Promise<ToneMode> {
  try {
    const rows = await db
      .select()
      .from(aiAssistantSettings)
      .where(eq(aiAssistantSettings.id, 1))
      .limit(1);

    const toneMode = rows[0]?.toneMode;
    if (toneMode === "formal" || toneMode === "warm" || toneMode === "calming" || toneMode === "balanced") {
      return toneMode;
    }
  } catch (err) {
    console.error("[getAssistantToneMode] error:", err);
  }

  return "balanced";
}

function detectEmotionalContext(message: string): {
  needsComfort: boolean;
  comfortLine: string;
} {
  const normalized = message.toLowerCase();

  const distressPatterns = [
    "bingung",
    "cemas",
    "khawatir",
    "takut",
    "gelisah",
    "resah",
    "capek",
    "lelah",
    "tertekan",
    "stres",
    "susah",
    "sulit",
    "tolong",
    "kasus",
    "masalah",
    "korban",
    "ditipu",
    "penipuan",
    "ancam",
    "diancam",
    "kekerasan",
    "dipukul",
    "kehilangan",
    "hilang",
    "sengketa",
    "diperas",
    "pelecehan",
  ];

  const needsComfort = distressPatterns.some((pattern) => normalized.includes(pattern));

  if (!needsComfort) {
    return { needsComfort: false, comfortLine: "" };
  }

  return {
    needsComfort: true,
    comfortLine:
      "Kami turut prihatin dengan kondisi yang sedang Anda hadapi. Tenang, kami akan bantu arahkan sebaik mungkin agar persoalan ini terasa lebih ringan untuk dijalani.",
  };
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
    "buat laporan",
    "mau lapor",
    "ingin lapor",
    "saya mau lapor",
    "saya ingin lapor",
    "saya ingin membuat laporan",
    "saya mau membuat laporan",
    "saya mau bikin laporan",
    "saya ingin bikin laporan",
    "mau bikin laporan",
    "ingin bikin laporan",
    "saya mau mengadukan",
    "saya ingin mengadukan",
    "mau mengadukan",
    "ingin mengadukan",
    "mau buat pengaduan",
    "ingin buat pengaduan",
  ].some((keyword) => normalized.includes(keyword));
}

function normalizePersonName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function detectName(text: string): string | null {
  const normalized = text.trim();
  const patterns = [
    /(?:nama saya|saya bernama|nama lengkap saya)\s+([a-zA-Z'. -]{2,50})/i,
    /(?:saya adalah|aku adalah)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/,
    /(?:saya|aku)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/,
    /(?:pak|bu|mas|mbak|kang|teh)\s+([a-zA-Z'. -]{2,50})/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const candidate = normalizePersonName(match[1]);
      if (candidate.length >= 2) {
        return candidate;
      }
    }
  }

  return null;
}

function detectGender(text: string): PersonGender {
  const normalized = text.toLowerCase();

  if (
    /\b(saya laki-laki|aku laki-laki|saya pria|aku pria|saya cowok|aku cowok|pak |bapak|mas |kang )\b/i.test(
      normalized
    )
  ) {
    return "male";
  }

  if (
    /\b(saya perempuan|aku perempuan|saya wanita|aku wanita|saya cewek|aku cewek|bu |ibu|mbak |teh )\b/i.test(
      normalized
    )
  ) {
    return "female";
  }

  return "unknown";
}

function inferPersonContext(
  history: Array<{ role: "user" | "admin"; content: string }>,
  message: string
): PersonContext {
  const userTexts = [...history, { role: "user" as const, content: message }]
    .filter((item) => item.role === "user")
    .map((item) => item.content);

  let name: string | null = null;
  let gender: PersonGender = "unknown";

  for (let i = userTexts.length - 1; i >= 0; i -= 1) {
    if (!name) {
      name = detectName(userTexts[i]);
    }

    if (gender === "unknown") {
      gender = detectGender(userTexts[i]);
    }

    if (name && gender !== "unknown") {
      break;
    }
  }

  let preferredGreeting = "Bapak/Ibu";
  if (name && gender === "male") {
    preferredGreeting = `Bapak ${name}`;
  } else if (name && gender === "female") {
    preferredGreeting = `Ibu ${name}`;
  } else if (name) {
    preferredGreeting = name;
  }

  return { name, gender, preferredGreeting };
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
  const person = inferPersonContext(history, message);
  const emotionalContext = detectEmotionalContext(message);
  const languageGuide = buildLanguageVariationGuide(message);
  const toneMode = await getAssistantToneMode();

  if (isReportIntent(message)) {
    return {
      reply: `${emotionalContext.needsComfort ? `${emotionalContext.comfortLine} ` : ""}Tentu ${person.preferredGreeting}, kalau mau buat laporan resmi bisa langsung isi lewat link ini ya: ${normalizedAppUrl}/lapor. Setelah dikirim, tim kami akan menindaklanjuti sesuai alur yang berlaku.`,
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
        `${emotionalContext.needsComfort ? `${emotionalContext.comfortLine} ` : ""}Terima kasih ${person.preferredGreeting}, pesan Anda sudah kami terima. Untuk memastikan informasinya tepat, pertanyaan ini akan kami bantu cek lebih lanjut oleh admin. ${languageGuide.closing} Jika ingin membuat laporan resmi, silakan isi lewat link ini ya: ` +
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

Balas warga dengan gaya yang hangat, sopan, natural, humanis, dan menenangkan. Jangan terdengar seperti bot, jangan mengaku AI, dan jangan menggunakan markdown.

ATURAN UTAMA:
1. Jawaban hanya boleh berdasarkan BANK DATA ADMIN di bawah ini.
2. Jangan menambah fakta baru yang tidak ada di referensi.
3. Jika warga sedang menghadapi persoalan, awali dengan empati dan rasa prihatin yang natural sebelum masuk ke informasi inti.
4. Tujuan utama balasan adalah membantu menenangkan hati dan pikiran warga, tanpa terkesan berlebihan atau dibuat-buat.
5. Jika referensi tidak cukup untuk menjawab lengkap, sampaikan dengan sopan bahwa admin akan membantu mengecek lebih lanjut.
6. Jika warga terlihat ingin tahu prosedur laporan, arahkan dengan lembut ke link ini: ${normalizedAppUrl}/lapor
7. Maksimal 500 karakter.
8. Tetap gunakan sapaan yang sopan seperti "Bapak", "Ibu", atau "Bapak/Ibu".
9. Jika nama warga sudah diketahui, sebut namanya secara natural agar terasa personal.
10. Jika gender terindikasi laki-laki, gunakan sapaan seperti "Bapak ${person.name ?? ""}" bila terasa natural.
11. Jika gender terindikasi perempuan, gunakan sapaan seperti "Ibu ${person.name ?? ""}" bila terasa natural.
12. Jika nama belum diketahui atau gender tidak jelas, gunakan sapaan netral seperti "Bapak/Ibu".
13. Jangan terdengar menggurui, jangan terlalu administratif, dan jangan langsung lompat ke prosedur tanpa sentuhan empati.
14. Variasikan perbendaharaan kata agar terasa seperti percakapan manusia, bukan template yang diulang-ulang.
15. Gunakan sinonim dan variasi susunan kalimat secara natural, tetapi isi faktanya tetap harus sama dengan referensi.
16. Hindari pembuka yang sama terus-menerus seperti "Baik" atau "Terima kasih" di setiap jawaban jika ada pilihan lain yang lebih natural.
17. Boleh gunakan variasi frasa seperti "izinkan kami bantu jelaskan", "supaya lebih jelas", "jadi begini ya", "untuk gambaran awal", "kalau mengacu pada informasi yang kami miliki", selama tetap sopan.
18. Penutup juga perlu bervariasi, misalnya "silakan sampaikan lagi", "kami siap bantu jelaskan", "bila masih ada yang mengganjal", dan jangan mengulang frasa penutup yang sama terus.
19. Jika ada empati, rangkai dengan kata-kata yang lembut dan bervariasi, jangan memakai kalimat belasungkawa yang identik di setiap balasan.

RIWAYAT CHAT:
${historyText}

PESAN BARU WARGA:
"${message}"

KONTEKS WARGA:
- Nama terdeteksi: ${person.name ?? "belum diketahui"}
- Gender terdeteksi: ${person.gender}
- Sapaan yang disarankan: ${person.preferredGreeting}
- Perlu nada menenangkan: ${emotionalContext.needsComfort ? "ya" : "tidak"}
- Kalimat empati yang bisa dipakai bila relevan: ${emotionalContext.comfortLine || "-"}
- Variasi pembuka yang disarankan: ${languageGuide.opening}
- Variasi empati yang disarankan: ${languageGuide.empathy}
- Variasi transisi yang disarankan: ${languageGuide.transition}
- Variasi penutup yang disarankan: ${languageGuide.closing}
- Tone default yang dipilih admin: ${toneMode}

BANK DATA ADMIN:
${knowledgeContext}

PANDUAN TONE:
- formal: lebih resmi, rapi, tertib, dan institusional
- warm: lebih cair, ramah, dekat, dan terasa seperti admin yang hangat
- calming: lebih empatik, menenangkan, dan membantu warga merasa lebih tenang
- balanced: seimbang antara sopan, natural, hangat, dan jelas

Gunakan tone default yang dipilih admin sebagai warna utama jawaban, tetapi tetap sesuaikan dengan kondisi warga dan konteks pertanyaannya.

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
    reply: `${emotionalContext.needsComfort ? `${languageGuide.empathy} ` : ""}${person.preferredGreeting}, ${languageGuide.opening} ${languageGuide.transition} ${summary} ${languageGuide.closing}`,
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
