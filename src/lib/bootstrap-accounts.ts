import { config } from "dotenv";
import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { bidang, user } from "./schema";
import {
  adminEmailFromEnv,
  resolveSeksiPassword,
  seksiEmailForKode,
  sharedBootstrapPassword,
} from "./seksi-accounts";

config({ path: ".env.local" });

/**
 * Satu kali jalan: buat admin + satu user per baris `bidang` (login seksi).
 *
 * Lokal (pakai .env.local yang sudah ada URL production jika perlu):
 *   npm run bootstrap:accounts
 *
 * Langsung ke domain Railway + Neon yang sama:
 *   BOOTSTRAP_APP_URL="https://xxx.up.railway.app" \
 *   DATABASE_URL="postgresql://..." \
 *   SAHATE_BOOTSTRAP_PASSWORD="..." \
 *   npx tsx src/lib/bootstrap-accounts.ts
 *
 * Sandi per seksi (opsional): SEKSI_PBIN_PASSWORD, SEKSI_PIDUM_PASSWORD, …
 *
 * Pastikan di Railway: BETTER_AUTH_URL & NEXT_PUBLIC_APP_URL = https yang sama (tanpa slash akhir).
 */

const APP_URL = (
  process.env.BOOTSTRAP_APP_URL ??
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  ""
).replace(/\/$/, "");

const ADMIN_NAME = process.env.SAHATE_ADMIN_NAME ?? "Admin SAHATE Kejari Cimahi";

async function signUp(email: string, password: string, name: string): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(`${APP_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: APP_URL,
    },
    body: JSON.stringify({ email, password, name }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

function looksLikeUserAlreadyExists(status: number, body: string) {
  if (status === 409) return true;
  const lower = body.toLowerCase();
  return (
    lower.includes("already") ||
    lower.includes("exists") ||
    lower.includes("duplicate") ||
    lower.includes("unique")
  );
}

async function ensureUser(params: {
  email: string;
  password: string;
  name: string;
  role: "admin" | "bidang";
  bidangId: number | null;
}) {
  const { email, password, name, role, bidangId } = params;

  const attempt = await signUp(email, password, name);
  if (attempt.ok) {
    await db
      .update(user)
      .set({
        role,
        bidangId,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(user.email, email));
    console.log(`  ✅ dibuat: ${email} (${role}${bidangId != null ? `, bidang_id=${bidangId}` : ""})`);
    return;
  }

  if (looksLikeUserAlreadyExists(attempt.status, attempt.body)) {
    const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if (!existing) {
      console.error(`  ❌ sign-up gagal dan user tidak ada di DB: ${email}`, attempt.status, attempt.body.slice(0, 200));
      throw new Error(`Sign-up failed for ${email}`);
    }
    await db
      .update(user)
      .set({
        role,
        bidangId,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(user.email, email));
    console.log(`  ↪ sudah ada, diperbarui role/seksi: ${email} (${role})`);
    return;
  }

  console.error(`  ❌ ${email}:`, attempt.status, attempt.body.slice(0, 400));
  throw new Error(`Sign-up failed for ${email}`);
}

async function main() {
  if (!APP_URL.startsWith("http")) {
    console.error("Set BOOTSTRAP_APP_URL atau BETTER_AUTH_URL atau NEXT_PUBLIC_APP_URL (https://...).");
    process.exit(1);
  }

  const PASSWORD = sharedBootstrapPassword(process.env);
  if (!PASSWORD || PASSWORD.length < 8) {
    console.error("Set SAHATE_BOOTSTRAP_PASSWORD (minimal 8 karakter) untuk admin atau sebagai sandi default seksi.");
    process.exit(1);
  }

  const ADMIN_EMAIL = adminEmailFromEnv(process.env);

  const rows = await db
    .select({ id: bidang.id, kode: bidang.kode, nama: bidang.nama })
    .from(bidang)
    .orderBy(asc(bidang.id));

  if (rows.length === 0) {
    console.error("Tabel bidang kosong. Jalankan dulu: npm run db:seed");
    process.exit(1);
  }

  console.log(`\nBootstrap akun → APP_URL=${APP_URL}\n`);

  await ensureUser({
    email: ADMIN_EMAIL,
    password: PASSWORD,
    name: ADMIN_NAME,
    role: "admin",
    bidangId: null,
  });

  for (const b of rows) {
    const email = seksiEmailForKode(b.kode);
    const sekPwd = resolveSeksiPassword(b.kode, process.env);
    if (!sekPwd || sekPwd.length < 8) {
      console.error(
        `❌ Sandi untuk ${b.kode} tidak valid (< 8). Set SAHATE_BOOTSTRAP_PASSWORD atau SEKSI_${b.kode}_PASSWORD`,
      );
      process.exit(1);
    }
    await ensureUser({
      email,
      password: sekPwd,
      name: b.nama,
      role: "bidang",
      bidangId: b.id,
    });
  }

  console.log("\nSelesai. Login admin: /admin/login");
  console.log("Login seksi: /seksi/login (bisa pakai kode seksi atau email).");
  console.log("Sandi admin: SAHATE_BOOTSTRAP_PASSWORD");
  console.log("Sandi seksi: SAHATE_BOOTSTRAP_PASSWORD atau SEKSI_<KODE>_PASSWORD per seksi.");
  console.log("Daftar email/sandi (dari .env): npm run credentials:sekci\n");
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
