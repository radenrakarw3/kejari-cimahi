import { randomUUID } from "crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verification } from "@/lib/schema";
import { normalizePhone } from "@/lib/whatsapp";

const requestSchema = z.object({
  nomorWa: z.string().regex(/^(08|628)\d{8,12}$/, "Format nomor WA tidak valid"),
  otp: z.string().regex(/^\d{4}$/, "Kode OTP harus 4 digit"),
});

const OTP_IDENTIFIER_PREFIX = "wa_otp:";
const VERIFIED_IDENTIFIER_PREFIX = "wa_verified:";
const VERIFIED_EXPIRY_MINUTES = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Data verifikasi tidak valid" }, { status: 400 });
    }

    const phoneNumber = normalizePhone(parsed.data.nomorWa);
    const otpIdentifier = `${OTP_IDENTIFIER_PREFIX}${phoneNumber}`;
    const now = new Date();

    const [otpRecord] = await db
      .select()
      .from(verification)
      .where(and(eq(verification.identifier, otpIdentifier), gte(verification.expiresAt, now)))
      .orderBy(desc(verification.createdAt))
      .limit(1);

    if (!otpRecord) {
      return NextResponse.json({ error: "OTP tidak ditemukan atau sudah kedaluwarsa" }, { status: 404 });
    }

    let storedCode = "";
    try {
      storedCode = JSON.parse(otpRecord.value).code ?? "";
    } catch {
      storedCode = "";
    }

    if (storedCode !== parsed.data.otp) {
      return NextResponse.json({ error: "Kode OTP tidak sesuai" }, { status: 400 });
    }

    await db.delete(verification).where(eq(verification.id, otpRecord.id));
    await db
      .delete(verification)
      .where(eq(verification.identifier, `${VERIFIED_IDENTIFIER_PREFIX}${phoneNumber}`));

    const verificationId = randomUUID();
    const expiresAt = new Date(now.getTime() + VERIFIED_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(verification).values({
      id: verificationId,
      identifier: `${VERIFIED_IDENTIFIER_PREFIX}${phoneNumber}`,
      value: JSON.stringify({ verified: true }),
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      ok: true,
      verificationId,
      expiresInSeconds: VERIFIED_EXPIRY_MINUTES * 60,
    });
  } catch (error) {
    console.error("POST /api/public/wa-otp/verify error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
