import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reports, categories, disposisi, bidang } from "@/lib/schema";
import { normalizePhone } from "@/lib/whatsapp";

const requestSchema = z.object({
  nomorLaporan: z.string().trim().min(3, "Nomor laporan wajib diisi"),
  nomorWa: z.string().trim().optional().default(""),
});

function maskName(name: string) {
  if (name === "Anonim") return "Pelapor Anonim";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Pelapor";

  return parts
    .map((part, index) => {
      if (part.length <= 1) return part;
      if (index === 0) return `${part[0]}${"*".repeat(Math.max(part.length - 1, 1))}`;
      return `${part[0]}${"*".repeat(Math.max(Math.min(part.length - 1, 3), 1))}`;
    })
    .join(" ");
}

function buildStatusLabel(status: string) {
  switch (status) {
    case "masuk":
      return "Laporan Diterima";
    case "disposisi":
      return "Sudah Didisposisi";
    case "diproses":
      return "Sedang Diproses";
    case "menunggu_data_tambahan":
      return "Menunggu Data Tambahan";
    case "selesai":
      return "Selesai Ditindaklanjuti";
    default:
      return "Dalam Penanganan";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.nomorLaporan?.[0] ?? "Validasi gagal" },
        { status: 400 }
      );
    }

    const nomorLaporan = parsed.data.nomorLaporan.toUpperCase();
    const nomorWa = parsed.data.nomorWa.trim();

    const [report] = await db
      .select({
        id: reports.id,
        nomorLaporan: reports.nomorLaporan,
        nama: reports.nama,
        nomorWa: reports.nomorWa,
        kelurahan: reports.kelurahan,
        rw: reports.rw,
        status: reports.status,
        outcomeType: reports.outcomeType,
        outcomeSummary: reports.outcomeSummary,
        outcomeFollowUp: reports.outcomeFollowUp,
        additionalInfoRequest: reports.additionalInfoRequest,
        additionalInfoRequestedAt: reports.additionalInfoRequestedAt,
        source: reports.source,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
        kategoriNama: categories.nama,
      })
      .from(reports)
      .leftJoin(categories, eq(reports.kategoriId, categories.id))
      .where(eq(reports.nomorLaporan, nomorLaporan))
      .limit(1);

    if (!report) {
      return NextResponse.json({ error: "Nomor laporan tidak ditemukan" }, { status: 404 });
    }

    if (report.nomorWa) {
      if (!nomorWa) {
        return NextResponse.json(
          { error: "Masukkan nomor WhatsApp yang dipakai saat melapor" },
          { status: 403 }
        );
      }

      if (normalizePhone(nomorWa) !== report.nomorWa) {
        return NextResponse.json({ error: "Nomor WhatsApp tidak cocok" }, { status: 403 });
      }
    }

    const [latestDisposisi] = await db
      .select({
        bidangNama: bidang.nama,
        disposedAt: disposisi.disposedAt,
      })
      .from(disposisi)
      .leftJoin(bidang, eq(disposisi.bidangId, bidang.id))
      .where(eq(disposisi.reportId, report.id))
      .orderBy(desc(disposisi.disposedAt))
      .limit(1);

    return NextResponse.json({
      data: {
        nomorLaporan: report.nomorLaporan,
        nama: maskName(report.nama),
        isAnonymous: report.nama === "Anonim" || report.nomorWa === "",
        kelurahan: report.kelurahan,
        rw: report.rw,
        status: report.status,
        statusLabel: buildStatusLabel(report.status),
        kategoriNama: report.kategoriNama ?? "Belum ditentukan",
        source: report.source,
        outcomeType: report.outcomeType ?? null,
        outcomeSummary: report.outcomeSummary ?? null,
        outcomeFollowUp: report.outcomeFollowUp ?? null,
        additionalInfoRequest: report.additionalInfoRequest ?? null,
        additionalInfoRequestedAt: report.additionalInfoRequestedAt ?? null,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        bidangNama: latestDisposisi?.bidangNama ?? null,
        disposedAt: latestDisposisi?.disposedAt ?? null,
      },
    });
  } catch (error) {
    console.error("POST /api/public/report-status error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
