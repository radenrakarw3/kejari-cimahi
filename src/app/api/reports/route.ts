import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports, categories, disposisi, bidang, user } from "@/lib/schema";
import { insertReportSchema } from "@/lib/schema";
import { generateNomorLaporan } from "@/lib/nomor-laporan";
import { sendWhatsApp, buildConfirmationMessage, normalizePhone } from "@/lib/whatsapp";
import { broadcastSseEvent } from "@/lib/sse";
import { auth } from "@/lib/auth";
import { eq, desc, ilike, and, count, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = insertReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const nomorLaporan = await generateNomorLaporan();

    const [report] = await db
      .insert(reports)
      .values({
        ...parsed.data,
        nomorWa: normalizePhone(parsed.data.nomorWa),
        nomorLaporan,
        source: body.source ?? "web",
        status: "masuk",
      })
      .returning();

    // Fire and forget: AI categorization
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    fetch(`${appUrl}/api/ai/categorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: report.id, isiLaporan: report.isiLaporan }),
    }).catch(() => {});

    // Fire and forget: WA confirmation
    sendWhatsApp(
      report.nomorWa,
      buildConfirmationMessage(report.nama, report.nomorLaporan)
    ).catch(() => {});

    // Broadcast SSE
    broadcastSseEvent({ type: "new_report", report });

    return NextResponse.json(
      { id: report.id, nomorLaporan: report.nomorLaporan },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/reports error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const kategoriId = searchParams.get("kategoriId");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status && status !== "all") conditions.push(eq(reports.status, status));
  if (kategoriId) conditions.push(eq(reports.kategoriId, parseInt(kategoriId)));
  if (source && source !== "all") conditions.push(eq(reports.source, source));
  if (search) {
    conditions.push(ilike(reports.nama, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db
      .select({
        id: reports.id,
        nomorLaporan: reports.nomorLaporan,
        nama: reports.nama,
        nomorWa: reports.nomorWa,
        kelurahan: reports.kelurahan,
        rw: reports.rw,
        isiLaporan: reports.isiLaporan,
        status: reports.status,
        source: reports.source,
        aiCategorySuggestion: reports.aiCategorySuggestion,
        aiConfidenceScore: reports.aiConfidenceScore,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
        kategoriId: reports.kategoriId,
        kategoriNama: categories.nama,
        kategoriWarna: categories.warna,
        kategoriKode: categories.kode,
      })
      .from(reports)
      .leftJoin(categories, eq(reports.kategoriId, categories.id))
      .where(whereClause)
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(reports).where(whereClause),
  ]);

  const total = totalResult[0]?.total ?? 0;

  return NextResponse.json({
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
