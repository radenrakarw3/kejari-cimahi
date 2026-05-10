import { randomInt, randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verification } from "@/lib/schema";
import { buildOtpMessage, normalizePhone, sendWhatsApp } from "@/lib/whatsapp";

const requestSchema = z.object({
  nomorWa: z.string().regex(/^(08|628)\d{8,12}$/, "Format nomor WA tidak valid"),
});

const OTP_IDENTIFIER_PREFIX = "wa_otp:";
const OTP_EXPIRY_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Nomor WhatsApp tidak valid" }, { status: 400 });
    }

    const phoneNumber = normalizePhone(parsed.data.nomorWa);
    const identifier = `${OTP_IDENTIFIER_PREFIX}${phoneNumber}`;
    const now = new Date();

    const [latestOtp] = await db
      .select({
        id: verification.id,
        createdAt: verification.createdAt,
      })
      .from(verification)
      .where(eq(verification.identifier, identifier))
      .orderBy(desc(verification.createdAt))
      .limit(1);

    if (latestOtp?.createdAt) {
      const secondsSinceLastOtp = Math.floor((now.getTime() - new Date(latestOtp.createdAt).getTime()) / 1000);
      if (secondsSinceLastOtp < OTP_COOLDOWN_SECONDS) {
        return NextResponse.json(
          { error: `Tunggu ${OTP_COOLDOWN_SECONDS - secondsSinceLastOtp} detik untuk kirim ulang OTP` },
          { status: 429 }
        );
      }
    }

    await db
      .delete(verification)
      .where(eq(verification.identifier, identifier));

    const code = String(randomInt(1000, 10000));
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const sendResult = await sendWhatsApp(phoneNumber, buildOtpMessage(code));

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error ?? "Gagal mengirim OTP ke WhatsApp" },
        { status: 502 }
      );
    }

    await db.insert(verification).values({
      id: randomUUID(),
      identifier,
      value: JSON.stringify({ code }),
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      ok: true,
      expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
      resendInSeconds: OTP_COOLDOWN_SECONDS,
    });
  } catch (error) {
    console.error("POST /api/public/wa-otp/send error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
