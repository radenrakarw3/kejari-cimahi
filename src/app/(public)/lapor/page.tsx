import { ReportWizard } from "@/components/public/report-wizard";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Lapor ke SAHATE Kejari Cimahi",
  description: "Sampaikan pengaduan dan kebutuhan layanan hukum Anda melalui SAHATE Kejari Cimahi",
};

export default function LaporPage() {
  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#071f0d" }}>
      {/* Gold strip */}
      <div className="h-1.5" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />

      {/* Top bar */}
      <div
        className="px-4 h-14 flex items-center justify-between sticky top-0 z-10 shadow-md"
        style={{ backgroundColor: "#0a3d1a", borderBottom: "1px solid rgba(240,180,41,0.15)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center p-0.5"
            style={{ backgroundColor: "rgba(240,180,41,0.15)", border: "1px solid rgba(240,180,41,0.35)" }}
          >
            <Image
              src="/logo-kejari.svg"
              alt="Logo"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
          <span className="font-semibold text-sm" style={{ color: "#f0b429" }}>SAHATE Kejari Cimahi</span>
        </Link>
        <Link href="/" className="text-xs hover:underline" style={{ color: "#a8d5b5" }}>
          ← Kembali
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5c518" }}>Formulir Pengaduan SAHATE</h1>
            <p className="text-sm" style={{ color: "#a8d5b5" }}>
              Isi data Anda langkah demi langkah untuk mendapatkan layanan hukum yang mudah, cepat, dan terintegrasi.
            </p>
          </div>

          <div
            className="rounded-2xl overflow-hidden shadow-xl"
            style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.2)" }}
          >
            <div className="h-1" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />
            <div className="p-6 sm:p-8">
              <ReportWizard />
            </div>
          </div>

          <p className="text-center text-xs mt-5 leading-relaxed" style={{ color: "rgba(168,213,181,0.5)" }}>
            Dengan mengirim laporan, Anda menyatakan bahwa informasi yang disampaikan
            adalah benar dan dapat dipertanggungjawabkan dalam layanan SAHATE Kejari Cimahi.
          </p>
        </div>
      </div>
    </main>
  );
}
