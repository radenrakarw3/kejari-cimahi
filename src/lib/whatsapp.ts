const STARSENDER_API_URL = "https://api.starsender.online/api/send";

function getStarSenderDeviceApiKey(): string {
  return (
    process.env.STARSENDER_DEVICE_API_KEY ??
    process.env.STARSENDER_API_KEY ??
    ""
  ).trim();
}

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
  const deviceApiKey = getStarSenderDeviceApiKey();
  const deviceId = process.env.STARSENDER_DEVICE_ID?.trim();

  if (!deviceApiKey) {
    return { success: false, error: "STARSENDER_DEVICE_API_KEY belum diatur" };
  }

  try {
    const response = await fetch(STARSENDER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: deviceApiKey,
      },
      body: JSON.stringify({
        messageType: "text",
        to,
        body: message,
        ...(deviceId ? { device_id: deviceId } : {}),
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

export function buildOtpMessage(code: string): string {
  return [
    `Kode OTP SAHATE Anda adalah ${code}.`,
    "Masukkan 4 digit ini untuk melanjutkan verifikasi nomor WhatsApp.",
    "Kode berlaku 10 menit. Jangan bagikan kode ini kepada siapa pun.",
  ].join("\n");
}

export function buildDisposisiMessage(
  nama: string,
  nomorLaporan: string,
  bidangNama: string,
  catatan?: string | null
): string {
  const parts = [
    `Halo ${nama}, laporan Anda dengan nomor ${nomorLaporan} sudah kami terima dan langsung kami teruskan ke seksi ${bidangNama}.`,
    "Saat ini laporan Anda sudah masuk ke jalur tindak lanjut, jadi tidak berhenti di tahap penerimaan saja.",
    "Mohon tenang, tim Kejari Cimahi sedang menanganinya setahap demi setahap dan kami akan terus memberi kabar perkembangannya.",
  ];

  if (catatan?.trim()) {
    parts.push("", `Catatan admin: ${catatan.trim()}`);
  }

  parts.push("", "Kami akan mengabari kembali saat laporan mulai diproses atau ketika penanganannya sudah selesai.");

  return parts.join("\n");
}

export function buildProsesMessage(
  nama: string,
  nomorLaporan: string,
  bidangNama: string
): string {
  return [
    `Halo ${nama}, laporan ${nomorLaporan} saat ini sedang diproses oleh seksi ${bidangNama}.`,
    "Laporan Anda sedang kami tindak lanjuti secara aktif, jadi mohon tetap tenang dan beri kami sedikit waktu untuk menuntaskan prosesnya dengan baik.",
    "Terima kasih sudah menunggu. Kami akan mengirim pembaruan lagi setelah penanganan selesai.",
  ].join("\n");
}

export function buildSelesaiMessage(
  nama: string,
  nomorLaporan: string,
  bidangNama?: string | null,
  outcomeSummary?: string | null
): string {
  const parts = [
    `Halo ${nama}, laporan ${nomorLaporan} telah selesai ditindaklanjuti${bidangNama ? ` oleh seksi ${bidangNama}` : ""}.`,
    "Terima kasih karena sudah mempercayakan laporan ini kepada Kejari Cimahi.",
  ];

  if (outcomeSummary?.trim()) {
    parts.push("", `Ringkasan hasil: ${outcomeSummary.trim()}`);
  }

  parts.push("", "Bila masih ada hal yang perlu disampaikan, Anda bisa membalas pesan ini kapan saja.");

  return parts.join("\n");
}

export function buildAdditionalInfoRequestMessage(
  nama: string,
  nomorLaporan: string,
  requestNote: string
) {
  return [
    `Halo ${nama}, untuk melanjutkan laporan ${nomorLaporan}, kami masih membutuhkan data tambahan dari Anda.`,
    "Agar penanganan tetap cepat dan tepat, mohon lengkapi informasi berikut:",
    requestNote.trim(),
    "",
    "Silakan balas pesan ini atau datang ke PTSP Kejari Cimahi bila Anda lebih nyaman melengkapi secara langsung.",
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
    `Disposisi baru untuk seksi ${params.bidangNama}.`,
    `Nomor laporan: ${params.nomorLaporan}`,
    `Nama warga: ${params.namaWarga}`,
    "",
    "Ringkasan laporan:",
    preview,
  ];

  if (params.catatan?.trim()) {
    parts.push("", `Catatan admin: ${params.catatan.trim()}`);
  }

  parts.push("", "Silakan buka portal seksi untuk menindaklanjuti laporan ini.");

  return parts.join("\n");
}
