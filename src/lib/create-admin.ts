import { config } from "dotenv";
config({ path: ".env.local" });
import { eq } from "drizzle-orm";
import { adminEmailFromEnv } from "./seksi-accounts";
import { db } from "./db";
import { user } from "./schema";

/**
 * Buat admin pertama ATAU perbaiki baris user admin (role + bidang_id + email terverifikasi).
 *
 *   npx tsx --env-file=.env.local src/lib/create-admin.ts
 *   npx tsx --env-file=.env.local src/lib/create-admin.ts admin@... SandiBaru! "Nama"
 *
 * Hanya perbaiki DB (tanpa sign-up) — berguna jika akun sudah ada tapi role/bidang_id salah:
 *   npx tsx --env-file=.env.local src/lib/create-admin.ts --repair
 *   npx tsx --env-file=.env.local src/lib/create-admin.ts --repair admin@custom.go.id
 */

const APP_URL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function looksLikeUserAlreadyExists(status: number, body: string) {
  if (status === 409 || status === 422) return true;
  const lower = body.toLowerCase();
  return (
    lower.includes("already") ||
    lower.includes("exists") ||
    lower.includes("duplicate") ||
    lower.includes("unique") ||
    lower.includes("registered")
  );
}

async function repairAdminInDb(emailNormalized: string) {
  const [row] = await db
    .select({ id: user.id, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.email, emailNormalized))
    .limit(1);

  if (!row) {
    console.error(`❌ Tidak ada user dengan email: ${emailNormalized}`);
    return false;
  }

  await db
    .update(user)
    .set({ role: "admin", bidangId: null, emailVerified: true, updatedAt: new Date() })
    .where(eq(user.id, row.id));

  console.log(`✅ Diperbaiki jadi admin (role=admin, bidang_id=null): ${row.email}`);
  if (row.role !== "admin") {
    console.log(`   (sebelumnya role di DB: ${row.role})`);
  }
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const repairIdx = args.indexOf("--repair");
  if (repairIdx !== -1) {
    const emailArg = args[repairIdx + 1];
    const email = (emailArg && !emailArg.startsWith("--")
      ? emailArg
      : adminEmailFromEnv(process.env)
    )
      .trim()
      .toLowerCase();
    console.log(`Memperbaiki akun admin di DB: ${email}`);
    const ok = await repairAdminInDb(email);
    process.exit(ok ? 0 : 1);
    return;
  }

  const email = (args[0] ?? "admin@kejari-cimahi.go.id").trim().toLowerCase();
  const password = args[1] ?? "Admin123!";
  const name = args[2] ?? "Admin Kejari Cimahi";

  console.log(`Creating admin: ${email}`);

  const res = await fetch(`${APP_URL.replace(/\/$/, "")}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: APP_URL.replace(/\/$/, ""),
    },
    body: JSON.stringify({ email, password, name }),
  });

  const text = await res.text();
  console.log(`Status: ${res.status}`);

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {
    console.log("Raw:", text);
  }

  if (res.ok) {
    const createdEmail = ((data.user as Record<string, unknown>)?.email ?? email) as string;
    const normalized = String(createdEmail).trim().toLowerCase();
    await db
      .update(user)
      .set({ role: "admin", bidangId: null, emailVerified: true, updatedAt: new Date() })
      .where(eq(user.email, normalized));
    console.log("✅ Admin created:", (data.user as Record<string, unknown>)?.email ?? data);
    process.exit(0);
    return;
  }

  const errHint = `${text} ${String(data.message ?? "")}`;
  if (looksLikeUserAlreadyExists(res.status, errHint)) {
    const repaired = await repairAdminInDb(email);
    if (repaired) {
      console.log(
        "   Sandi tetap yang lama. Untuk sandi baru, gunakan fitur lupa sandi atau hapus akun uji di DB."
      );
      process.exit(0);
      return;
    }
  }

  console.error("❌ Failed:", data.message ?? text);
  process.exit(1);
}

main();
