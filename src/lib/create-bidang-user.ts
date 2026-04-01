import { config } from "dotenv";
config({ path: ".env.local" });

import { eq } from "drizzle-orm";
import { db } from "./db";
import { bidang, user } from "./schema";

const APP_URL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4];
  const bidangKode = process.argv[5];
  const phoneNumber = process.argv[6] ?? null;

  if (!email || !password || !name || !bidangKode) {
    console.error("Usage: npm run create-bidang-user -- <email> <password> <name> <kodeBidang>");
    process.exit(1);
  }

  const [targetBidang] = await db
    .select({
      id: bidang.id,
      nama: bidang.nama,
      kode: bidang.kode,
    })
    .from(bidang)
    .where(eq(bidang.kode, bidangKode))
    .limit(1);

  if (!targetBidang) {
    console.error(`Bidang dengan kode ${bidangKode} tidak ditemukan.`);
    process.exit(1);
  }

  console.log(`Creating bidang user: ${email} -> ${targetBidang.nama} (${targetBidang.kode})`);

  const res = await fetch(`${APP_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: APP_URL,
    },
    body: JSON.stringify({ email, password, name }),
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {
    console.log("Raw:", text);
  }

  if (!res.ok) {
    console.error("❌ Failed:", data.message ?? text);
    process.exit(1);
  }

  const createdEmail = ((data.user as Record<string, unknown>)?.email ?? email) as string;

  await db
    .update(user)
    .set({
      role: "bidang",
      bidangId: targetBidang.id,
      phoneNumber,
      updatedAt: new Date(),
    })
    .where(eq(user.email, createdEmail));

  console.log(`✅ Bidang user ready: ${createdEmail} -> ${targetBidang.nama}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
