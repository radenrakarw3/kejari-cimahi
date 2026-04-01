import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/schema";

export async function GET() {
  const data = await db
    .select({
      id: categories.id,
      nama: categories.nama,
      kode: categories.kode,
      warna: categories.warna,
    })
    .from(categories)
    .orderBy(asc(categories.nama));

  return NextResponse.json({ data });
}
