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
  const parts = [
    `Baik ${nama}, laporan sudah kami terima dengan nomor ${nomorLaporan}.`,
    ``,
    `Catat nomornya ya, biar bisa dipantau perkembangannya. Tim akan segera tindaklanjuti dan akan menghubungi kembali kalau ada yang perlu dikonfirmasi.`,
  ];

  if (surveyUrl) {
    parts.push(``, `Kalau berkenan, ada survei singkat buat perbaikan layanan kami:`, surveyUrl);
  }

  return parts.join("\n");
}

export function buildDisposisiMessage(
  nama: string,
  nomorLaporan: string,
  bidangNama: string,
  catatan?: string | null
): string {
  const parts = [
    `Halo ${nama}, laporan Anda dengan nomor ${nomorLaporan} sudah kami teruskan ke ${bidangNama}.`,
    `Tim terkait akan menindaklanjuti laporan Anda secepatnya.`,
  ];

  if (catatan?.trim()) {
    parts.push("", `Catatan admin: ${catatan.trim()}`);
  }

  parts.push("", "Kami akan mengabari lagi saat proses berjalan atau sudah selesai.");

  return parts.join("\n");
}

export function buildProsesMessage(
  nama: string,
  nomorLaporan: string,
  bidangNama: string
): string {
  return [
    `Halo ${nama}, laporan ${nomorLaporan} saat ini sedang diproses oleh ${bidangNama}.`,
    "Terima kasih sudah menunggu. Kami akan mengirim pembaruan kembali setelah penanganan selesai.",
  ].join("\n");
}

export function buildSelesaiMessage(
  nama: string,
  nomorLaporan: string,
  bidangNama?: string | null
): string {
  return [
    `Halo ${nama}, laporan ${nomorLaporan} telah selesai ditindaklanjuti${bidangNama ? ` oleh ${bidangNama}` : ""}.`,
    "Bila masih ada hal yang perlu disampaikan, Anda bisa membalas pesan ini kapan saja.",
  ].join("\n");
}

export function buildBidangDisposisiNotification(params: {
  bidangNama: string;
  nomorLaporan: string;
  namaWarga: string;
  isiLaporan: string;
  catatan?: string | null;
}) {
  const preview = params.isiLaporan.length > 220
    ? `${params.isiLaporan.slice(0, 220)}...`
    : params.isiLaporan;

  const parts = [
    `Disposisi baru untuk ${params.bidangNama}.`,
    `Nomor laporan: ${params.nomorLaporan}`,
    `Nama warga: ${params.namaWarga}`,
    "",
    "Ringkasan laporan:",
    preview,
  ];

  if (params.catatan?.trim()) {
    parts.push("", `Catatan admin: ${params.catatan.trim()}`);
  }

  parts.push("", "Silakan buka portal bidang untuk menindaklanjuti laporan ini.");

  return parts.join("\n");
}
