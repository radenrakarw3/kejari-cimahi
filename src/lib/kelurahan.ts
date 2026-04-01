type KelurahanItem = {
  nama: string;
  kodepos: string;
  catatan?: string;
};

type WilayahItem = {
  kecamatan: string;
  kodeposRange: string;
  kelurahan: readonly KelurahanItem[];
};

export const WILAYAH_CIMAHI = [
  {
    kecamatan: "Cimahi Utara",
    kodeposRange: "40511-40514",
    kelurahan: [
      { nama: "Cibabat", kodepos: "40513" },
      { nama: "Cipageran", kodepos: "40511" },
      { nama: "Citeureup", kodepos: "40512" },
      { nama: "Pasirkaliki", kodepos: "40514" },
    ],
  },
  {
    kecamatan: "Cimahi Tengah",
    kodeposRange: "40521-40526",
    kelurahan: [
      { nama: "Baros", kodepos: "40521" },
      { nama: "Cigugur Tengah", kodepos: "40522" },
      { nama: "Cimahi", kodepos: "40525", catatan: "Pusat Pemerintahan" },
      { nama: "Karangmekar", kodepos: "40523" },
      { nama: "Padasuka", kodepos: "40526" },
      { nama: "Setiamanah", kodepos: "40524" },
    ],
  },
  {
    kecamatan: "Cimahi Selatan",
    kodeposRange: "40531-40535",
    kelurahan: [
      { nama: "Cibeber", kodepos: "40531" },
      { nama: "Cibeureum", kodepos: "40535" },
      { nama: "Leuwigajah", kodepos: "40532" },
      { nama: "Melong", kodepos: "40534" },
      { nama: "Utama", kodepos: "40533" },
    ],
  },
] as const satisfies readonly WilayahItem[];

export const KELURAHAN_CIMAHI = WILAYAH_CIMAHI.flatMap((wilayah) =>
  wilayah.kelurahan.map((item) => item.nama)
) as readonly string[];

export const KELURAHAN_DETAIL_CIMAHI = WILAYAH_CIMAHI.flatMap((wilayah) =>
  wilayah.kelurahan.map((item) => ({
    nama: item.nama,
    kodepos: item.kodepos,
    kecamatan: wilayah.kecamatan,
    kodeposRangeKecamatan: wilayah.kodeposRange,
    catatan: "catatan" in item ? item.catatan ?? null : null,
  }))
);

export const RW_OPTIONS = Array.from({ length: 50 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
