import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reports } from "@/lib/schema";
import { requirePtspAccess } from "@/lib/ptsp-auth";

export async function GET(req: NextRequest) {
  const unauthorized = await requirePtspAccess();
  if (unauthorized) return unauthorized;

  const reportNumber = req.nextUrl.searchParams.get("number")?.trim().toUpperCase() ?? "";
  if (!reportNumber) {
    return NextResponse.json({ error: "Nomor laporan wajib diisi" }, { status: 400 });
  }

  const [report] = await db
    .select({
      id: reports.id,
      nomorLaporan: reports.nomorLaporan,
      nama: reports.nama,
      status: reports.status,
    })
    .from(reports)
    .where(eq(reports.nomorLaporan, reportNumber))
    .limit(1);

  if (!report) {
    return NextResponse.json(
      { error: "Nomor laporan harus persis sama dengan yang terdaftar" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: report });
}
