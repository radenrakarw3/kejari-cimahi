import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports, categories, verification, reportAttachments } from "@/lib/schema";
import { insertReportSchema } from "@/lib/schema";
import { generateNomorLaporan } from "@/lib/nomor-laporan";
import { sendWhatsApp, buildConfirmationMessage, normalizePhone } from "@/lib/whatsapp";
import { broadcastSseEvent } from "@/lib/sse";
import { auth } from "@/lib/auth";
import { eq, desc, ilike, and, count, gte } from "drizzle-orm";
import { z } from "zod";
import { createReportAuditLog } from "@/lib/report-audit";
import { persistReportAttachments } from "@/lib/report-files";

type ReportRequestBody = Record<string, unknown> & {
  source?: string;
  isAnonymous?: boolean;
  waVerificationId?: string;
  kategoriId?: string | number | null;
  priorityLevel?: string;
  priorityReason?: string;
};

async function parseReportRequest(req: NextRequest): Promise<{
  body: ReportRequestBody;
  attachments: File[];
}> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const attachments = formData
      .getAll("attachments")
      .filter((value): value is File => value instanceof File && value.size > 0);

    return {
      body: {
        isAnonymous: formData.get("isAnonymous") === "true",
        nama: String(formData.get("nama") ?? ""),
        nomorWa: String(formData.get("nomorWa") ?? ""),
        waVerificationId: String(formData.get("waVerificationId") ?? ""),
        kelurahan: String(formData.get("kelurahan") ?? ""),
        rw: String(formData.get("rw") ?? ""),
        kategoriId: String(formData.get("kategoriId") ?? ""),
        isiLaporan: String(formData.get("isiLaporan") ?? ""),
        priorityLevel: String(formData.get("priorityLevel") ?? "normal"),
        priorityReason: String(formData.get("priorityReason") ?? ""),
        source: String(formData.get("source") ?? "web"),
      },
      attachments,
    };
  }

  const body = (await req.json()) as ReportRequestBody;
  return { body, attachments: [] };
}

export async function POST(req: NextRequest) {
  try {
    const { body, attachments } = await parseReportRequest(req);
    const isOffline = body.source === "offline";
    const isAnonymous = body.isAnonymous === true;
    const waVerificationId =
      typeof body.waVerificationId === "string" ? body.waVerificationId.trim() : "";
    const offlineSchema = insertReportSchema.extend({
      nomorWa: z.string().regex(/^(08|628)\d{8,12}$/).or(z.string().length(0)),
    });
    const anonymousSchema = insertReportSchema.extend({
      nama: z.literal("Anonim"),
      nomorWa: z.string().length(0),
    });
    const parsed = (isOffline ? offlineSchema : isAnonymous ? anonymousSchema : insertReportSchema).safeParse(body);
    const kategoriValue = body.kategoriId;
    const priorityLevel =
      typeof body.priorityLevel === "string" &&
      ["rendah", "normal", "penting", "mendesak", "kritis"].includes(body.priorityLevel)
        ? body.priorityLevel
        : "normal";
    const priorityReason =
      typeof body.priorityReason === "string" && body.priorityReason.trim()
        ? body.priorityReason.trim()
        : null;
    const kategoriId =
      kategoriValue === "unknown" || kategoriValue === "" || kategoriValue == null
        ? null
        : Number(kategoriValue);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validasi gagal", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!isOffline && !isAnonymous) {
      if (!waVerificationId) {
        return NextResponse.json(
          { error: "Nomor WhatsApp harus diverifikasi dengan OTP terlebih dahulu" },
          { status: 400 }
        );
      }

      const normalizedPhone = normalizePhone(parsed.data.nomorWa);
      const [verifiedWa] = await db
        .select({
          id: verification.id,
        })
        .from(verification)
        .where(
          and(
            eq(verification.id, waVerificationId),
            eq(verification.identifier, `wa_verified:${normalizedPhone}`),
            gte(verification.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!verifiedWa) {
        return NextResponse.json(
          { error: "Verifikasi OTP tidak valid atau sudah kedaluwarsa" },
          { status: 400 }
        );
      }

      await db.delete(verification).where(eq(verification.id, waVerificationId));
    }

    if (kategoriId !== null) {
      if (!Number.isInteger(kategoriId) || kategoriId <= 0) {
        return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
      }

      const [selectedCategory] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, kategoriId))
        .limit(1);

      if (!selectedCategory) {
        return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 400 });
      }
    }

    const nomorLaporan = await generateNomorLaporan();

    const [report] = await db
      .insert(reports)
      .values({
        ...parsed.data,
        kategoriId,
        nomorWa: parsed.data.nomorWa ? normalizePhone(parsed.data.nomorWa) : "",
        nomorLaporan,
        source: body.source ?? "web",
        priorityLevel,
        priorityReason,
        status: "masuk",
      })
      .returning();

    if (attachments.length > 0) {
      const savedAttachments = await persistReportAttachments(report.id, attachments);
      if (savedAttachments.length > 0) {
        await db.insert(reportAttachments).values(savedAttachments);
      }
    }

    await createReportAuditLog({
      reportId: report.id,
      action: "report_created",
      actorType: isOffline ? "admin" : "public",
      actorName: isOffline ? "PTSP Lobby" : isAnonymous ? "Pelapor Anonim" : report.nama,
      summary:
        attachments.length > 0
          ? `Laporan dibuat dengan ${attachments.length} lampiran bukti`
          : "Laporan dibuat tanpa lampiran",
      metadata: {
        source: report.source,
        isAnonymous,
        kategoriId,
        priorityLevel,
        attachmentCount: attachments.length,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const surveyUrl = `${appUrl}/survey/${report.id}`;

    // Fire and forget: WA confirmation
    if (report.nomorWa) {
      sendWhatsApp(
        report.nomorWa,
        buildConfirmationMessage(report.nama, report.nomorLaporan, surveyUrl)
      ).catch(() => {});
    }

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
  const priority = searchParams.get("priority");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status && status !== "all") conditions.push(eq(reports.status, status));
  if (kategoriId) conditions.push(eq(reports.kategoriId, parseInt(kategoriId)));
  if (source && source !== "all") conditions.push(eq(reports.source, source));
  if (priority && priority !== "all") conditions.push(eq(reports.priorityLevel, priority));
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
        priorityLevel: reports.priorityLevel,
        priorityReason: reports.priorityReason,
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
