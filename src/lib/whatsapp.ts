const STARSENDER_API_URL = "https://api.starsender.online/api/send";

export function normalizePhone(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) return "62" + clean.slice(1);
  if (!clean.startsWith("62")) return "62" + clean;
  return clean;
}

export function displayPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  return "0" + normalized.slice(2);
}

export async function sendWhatsApp(
  phoneNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const to = normalizePhone(phoneNumber);

  try {
    const response = await fetch(STARSENDER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: process.env.STARSENDER_API_KEY!,
      },
      body: JSON.stringify({
        messageType: "text",
        to,
        body: message,
        device_id: process.env.STARSENDER_DEVICE_ID,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: err };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export function buildConfirmationMessage(
  nama: string,
  nomorLaporan: string,
  surveyUrl?: string
): string {
  return `Assalamualaikum Wr. Wb.

Halo ${nama},

Laporan Anda telah kami terima melalui SAHATE KEJARI CIMAHI dengan nomor:

*${nomorLaporan}*

Simpan nomor ini untuk memantau status laporan Anda.

Kami akan segera memproses laporan Anda dan menghubungi kembali jika diperlukan informasi tambahan.

SAHATE adalah Sistem Akses Hukum Terpadu dan Elektronik Kejaksaan Negeri Cimahi.

Terima kasih telah mempercayakan layanan hukum Anda kepada SAHATE Kejari Cimahi.

${surveyUrl ? `Link survey resmi layanan:\n${surveyUrl}\n` : ""}

Wassalamualaikum Wr. Wb.`;
}
