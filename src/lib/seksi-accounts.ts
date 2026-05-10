/**
 * Akun login seksi: role DB tetap `"bidang"`, route UI `/seksi`.
 * Email per seksi: seksi.{kodeLower}@kejari-cimahi.go.id
 *
 * Sandi:
 * - Default: env `SAHATE_BOOTSTRAP_PASSWORD` (semua seksi + admin bootstrap)
 * - Opsional per seksi: `SEKSI_PBIN_PASSWORD`, `SEKSI_INTEL_PASSWORD`, dst. (huruf kode harus sama dengan di DB)
 */

export const SAHATE_ADMIN_EMAIL_DEFAULT = "admin@kejari-cimahi.go.id";

/** Selaras dengan seed `bidang` di src/lib/seed.ts (jangan ubah kode tanpa sinkron seed). */
export const SEKSI_DEFINITIONS = [
  { kode: "PBIN", nama: "Seksi Pembinaan" },
  { kode: "INTEL", nama: "Seksi Intelijen" },
  { kode: "PIDUM", nama: "Seksi Tindak Pidana Umum" },
  { kode: "PIDSUS", nama: "Seksi Tindak Pidana Khusus" },
  { kode: "DATUN", nama: "Seksi Perdata dan Tata Usaha Negara" },
  { kode: "PAPBB", nama: "Seksi Pemulihan Aset dan Pengelolaan Barang Bukti" },
] as const;

export type SeksiKode = (typeof SEKSI_DEFINITIONS)[number]["kode"];

export function seksiEmailForKode(kode: string): string {
  const normalized = kode.trim().toUpperCase().toLowerCase();
  return `seksi.${normalized}@kejari-cimahi.go.id`;
}

export function adminEmailFromEnv(env: NodeJS.ProcessEnv): string {
  return (env.SAHATE_ADMIN_EMAIL ?? SAHATE_ADMIN_EMAIL_DEFAULT).toLowerCase().trim();
}

export function sharedBootstrapPassword(env: NodeJS.ProcessEnv): string {
  return env.SAHATE_BOOTSTRAP_PASSWORD?.trim() ?? "";
}

/** Nama env opsional untuk sandi khusus seksi PBIN → SEKSI_PBIN_PASSWORD */
export function seksiPasswordEnvKey(kode: string): string {
  return `SEKSI_${kode.trim().toUpperCase()}_PASSWORD`;
}

/** Sandi untuk seksi: override per kode atau fallback `SAHATE_BOOTSTRAP_PASSWORD`. */
export function resolveSeksiPassword(kode: string, env: NodeJS.ProcessEnv = process.env): string {
  const key = seksiPasswordEnvKey(kode);
  const override = env[key]?.trim();
  const shared = sharedBootstrapPassword(env);
  if (override && override.length >= 8) return override;
  return shared;
}

export function seksiRowsWithEmails(): ReadonlyArray<{
  kode: SeksiKode;
  nama: string;
  email: string;
  passwordEnvKeys: readonly [string, "SAHATE_BOOTSTRAP_PASSWORD"];
}> {
  return SEKSI_DEFINITIONS.map((row) => ({
    kode: row.kode,
    nama: row.nama,
    email: seksiEmailForKode(row.kode),
    passwordEnvKeys: [seksiPasswordEnvKey(row.kode), "SAHATE_BOOTSTRAP_PASSWORD"] as const,
  }));
}
