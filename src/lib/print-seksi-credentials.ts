import { existsSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";
import {
  adminEmailFromEnv,
  resolveSeksiPassword,
  seksiRowsWithEmails,
  sharedBootstrapPassword,
} from "./seksi-accounts";

const root = process.cwd();
for (const name of [".env.local", ".env"]) {
  const p = resolve(root, name);
  if (existsSync(p)) {
    config({ path: p, override: true });
  }
}

const mask =
  typeof process.argv[2] === "string" &&
  (process.argv[2] === "--mask" || process.argv.includes("--mask"));

function showSecret(s: string) {
  if (!s) return "(belum di-set)";
  if (mask) return "*".repeat(Math.min(s.length, 12));
  return s;
}

function main() {
  const adminEmail = adminEmailFromEnv(process.env);
  const adminPw = sharedBootstrapPassword(process.env);

  console.log("\n=== ADMIN (bootstrap) ===\n");
  console.log(`Email     : ${adminEmail}`);
  console.log(`Password  : ${showSecret(adminPw)}  (SAHATE_BOOTSTRAP_PASSWORD)`);

  console.log("\n=== SEKSI (login /seksi — email + password) ===\n");

  for (const row of seksiRowsWithEmails()) {
    const sekPw = resolveSeksiPassword(row.kode, process.env);
    const specificKey = row.passwordEnvKeys[0];
    const source =
      process.env[specificKey]?.trim() && process.env[specificKey]!.trim().length >= 8
        ? specificKey
        : "SAHATE_BOOTSTRAP_PASSWORD";
    console.log(`• ${row.kode} — ${row.nama}`);
    console.log(`  Email   : ${row.email}`);
    console.log(`  Sandi   : ${showSecret(sekPw)}  (sumber env: ${source})`);
    if (!mask && sekPw.length < 8) {
      console.log(`  ⚠️  Set ${specificKey} atau SAHATE_BOOTSTRAP_PASSWORD (minimal 8 karakter)`);
    }
    console.log("");
  }

  console.log("Sembunyikan nilai sandi: npm run credentials:seksi -- --mask\n");
}

main();
