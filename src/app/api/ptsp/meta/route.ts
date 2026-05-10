import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { bidang } from "@/lib/schema";
import { requirePtspAccess } from "@/lib/ptsp-auth";

export async function GET() {
  const unauthorized = await requirePtspAccess();
  if (unauthorized) return unauthorized;

  const sections = await db
    .select({
      id: bidang.id,
      nama: bidang.nama,
      kode: bidang.kode,
    })
    .from(bidang)
    .orderBy(asc(bidang.nama));

  return NextResponse.json({ bidang: sections });
}
