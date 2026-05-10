/**
 * URL untuk tautan di pesan WhatsApp (StarSender).
 * Menghindari localhost/127.0.0.1 agar warga tidak menerima link percobaan lokal.
 */

/** Fallback jika env belum diisi (domain resmi SAHATE Kejari Cimahi). */
const DEFAULT_REPORT_FORM_URL = "https://sahatekejaricimahi.id/lapor";

function isUnsafeLocalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]";
  } catch {
    return true;
  }
}

function originFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

/**
 * Basis URL publik (tanpa trailing slash) untuk path seperti /survey/:id
 */
export function getPublicAppUrlForMessaging(): string {
  const explicit = process.env.WHATSAPP_PUBLIC_APP_URL?.trim();
  if (explicit && !isUnsafeLocalUrl(explicit)) {
    return explicit.replace(/\/$/, "");
  }

  for (const key of ["NEXT_PUBLIC_APP_URL", "BETTER_AUTH_URL"] as const) {
    const v = process.env[key]?.trim();
    if (v && !isUnsafeLocalUrl(v)) {
      return v.replace(/\/$/, "");
    }
  }

  const fromReportForm = process.env.WHATSAPP_REPORT_FORM_URL?.trim();
  if (fromReportForm) {
    const origin = originFromUrl(fromReportForm);
    if (origin) return origin;
  }

  return originFromUrl(DEFAULT_REPORT_FORM_URL) ?? "";
}

/**
 * Halaman form laporan untuk diarahkan dari WA (otomatis + fallback produksi).
 */
export function getReportFormUrlForMessaging(): string {
  const explicit = process.env.WHATSAPP_REPORT_FORM_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const base = getPublicAppUrlForMessaging();
  if (base) return `${base}/lapor`;

  return DEFAULT_REPORT_FORM_URL.replace(/\/$/, "");
}

/**
 * URL survei singkat setelah laporan; null jika tidak ada basis publik yang aman.
 */
export function buildPublicSurveyUrl(reportId: number | string): string | null {
  const base = getPublicAppUrlForMessaging();
  if (!base) return null;
  return `${base}/survey/${reportId}`;
}
