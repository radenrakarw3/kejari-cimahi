import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bidang, user } from "@/lib/schema";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { identifier?: string };
    const identifier = body.identifier?.trim();

    if (!identifier) {
      return NextResponse.json({ error: "Kode bidang wajib diisi" }, { status: 400 });
    }

    if (identifier.includes("@")) {
      return NextResponse.json({ email: identifier.toLowerCase() });
    }

    const bidangKode = identifier.toUpperCase();

    const [bidangUser] = await db
      .select({
        email: user.email,
        bidangNama: bidang.nama,
        bidangKode: bidang.kode,
      })
      .from(user)
      .innerJoin(bidang, eq(user.bidangId, bidang.id))
      .where(and(eq(user.role, "bidang"), eq(bidang.kode, bidangKode)))
      .limit(1);

    if (!bidangUser) {
      return NextResponse.json(
        { error: `Akun untuk kode bidang ${bidangKode} belum tersedia` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      email: bidangUser.email,
      bidangNama: bidangUser.bidangNama,
      bidangKode: bidangUser.bidangKode,
    });
  } catch (error) {
    console.error("Resolve bidang login error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
