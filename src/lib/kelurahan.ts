// Daftar kelurahan di Kota Cimahi
export const KELURAHAN_CIMAHI = [
  // Cimahi Selatan
  "Cibeber",
  "Cibeureum",
  "Leuwigajah",
  "Melong",
  "Utama",
  // Cimahi Tengah
  "Baros",
  "Cigugur Tengah",
  "Cimahi",
  "Karangmekar",
  "Padasuka",
  "Setiamanah",
  // Cimahi Utara
  "Cipageran",
  "Citeureup",
  "Gununghalu (Pasirkaliki)",
  "Pasirkaliki",
] as const;

export const RW_OPTIONS = Array.from({ length: 20 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
