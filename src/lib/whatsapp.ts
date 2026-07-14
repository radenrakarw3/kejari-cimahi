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

function sapaPelapor(nama: string): string {
  const n = nama.trim();
  if (!n || n.toLowerCase() === "anonim") return "Bapak/Ibu";
  return n;
}

export function buildConfirmationMessage(
  nama: string,
  nomorLaporan: string,
  surveyUrl?: string
): string {
  const sapa = sapaPelapor(nama);
  const parts = [
    `Halo ${sapa},`,
    ``,
    `Laporan sudah masuk ke sistem kami. Nomor tiket: ${nomorLaporan} — tolong disimpan, berguna kalau nanti ingin menanyakan perkembangan.`,
    ``,
    `Tenang saja: identitas dan isi laporan kami lindungi sesuai aturan pelayanan; tidak disebarluaskan tanpa keperluan resmi.`,
    `Kami akan kabari perkembangan secepat mungkin lewat nomor ini. Kalau ada hal mendesak, silakan balas pesan ini.`,
  ];

  if (surveyUrl) {
    parts.push(
      ``,
      `Jika berkenan, lembar pendapat singkat lewat tautan berikut membantu kami memperbaiki layanan (tautan ke website resmi):`,
      surveyUrl
    );
  }

  return parts.join("\n");
}

export function buildDisposisiMessage(
  nama: string,
  nomorLaporan: string,
  bidangNama: string,
  catatan?: string | null
): string {
  const sapa = sapaPelapor(nama);
  const parts = [
    `Halo ${sapa},`,
    ``,
    `Laporan nomor ${nomorLaporan} sudah kami teruskan ke seksi ${bidangNama}. Artinya perkara tidak berhenti di meja penerimaan — sudah masuk ke penanganan.`,
    `Informasi yang Anda berikan tetap kami perlakukan dengan hati-hati; yang perlu diketahui pihak lain akan disampaikan lewat jalur resmi saja.`,
  ];

  if (catatan?.trim()) {
    parts.push("", `Catatan singkat dari petugas: ${catatan.trim()}`);
  }

  parts.push(
    "",
    "Kami akan kabari lagi begitu ada langkah konkrit atau ada perkembangan penting. Kalau ada keraguan, balas pesan ini saja."
  );

  return parts.join("\n");
}

export function buildProsesMessage(
  nama: string,
  nomorLaporan: string,
  bidangNama: string
): string {
  const sapa = sapaPelapor(nama);
  return [
    `Halo ${sapa},`,
    ``,
    `Laporan ${nomorLaporan} sedang ditangani seksi ${bidangNama}. Tim sedang mengerjakan langkah yang diperlukan; mohon sedikit waktu agar pemeriksaan berjalan rapi.`,
    `Privasi data Anda tetap dijaga selama proses ini berlangsung.`,
    ``,
    "Begitu ada perkembangan jelas atau penanganan tuntas, kami kabari lagi lewat nomor ini.",
  ].join("\n");
}

export function buildSelesaiMessage(
  nama: string,
  nomorLaporan: string,
  bidangNama?: string | null,
  outcomeSummary?: string | null
): string {
  const sapa = sapaPelapor(nama);
  const parts = [
    `Halo ${sapa},`,
    ``,
    `Untuk laporan nomor ${nomorLaporan}, penanganan di sisi kami sudah beres${bidangNama ? ` (melalui seksi ${bidangNama})` : ""}.`,
    "Terima kasih sudah menyampaikan hal ini lewat jalur resmi — itu membantu kami bekerja lebih terarah.",
  ];

  if (outcomeSummary?.trim()) {
    parts.push("", `Secara singkat hasilnya: ${outcomeSummary.trim()}`);
  }

  parts.push(
    "",
    "Kalau masih ada yang mengganjal atau butuh penjelasan lanjutan, silakan balas pesan ini; data yang sudah Anda berikan tetap kami perlakukan dengan tertib."
  );

  return parts.join("\n");
}

export function buildAdditionalInfoRequestMessage(
  nama: string,
  nomorLaporan: string,
  requestNote: string
) {
  const sapa = sapaPelapor(nama);
  return [
    `Halo ${sapa},`,
    ``,
    `Agar laporan nomor ${nomorLaporan} bisa kami proses lanjut, masih ada beberapa hal yang perlu dilengkapi.`,
    "Mohon bantu isi bagian berikut (cukup yang menurut Anda aman dibagikan; jika ragu, tulis saja di balasan):",
    requestNote.trim(),
    "",
    "Bisa balas lewat WA ini atau datang ke PTSP Kejari Cimahi kalau lebih nyaman bicara langsung. Yang Anda kirimkan kami gunakan hanya untuk kepentingan penanganan laporan ini.",
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
    parts.push("", `Catatan singkat: ${params.catatan.trim()}`);
  }

  parts.push(
    "",
    "Mohon cek portal seksi untuk tindak lanjut. Data pelapor dan isi laporan tetap dalam lingkup tugas; jangan disebar di luar kebutuhan penanganan."
  );

  return parts.join("\n");
}
