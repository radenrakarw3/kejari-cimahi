import Image from "next/image";
import { StatusTracker } from "./status-tracker";

export default async function CekStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ nomor?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#071f0d" }}>
      <div className="fixed top-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />

      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-sm" style={{ color: "#a8d5b5" }}>
            <Image src="/logo-kejari.svg" alt="Logo" width={20} height={20} className="object-contain opacity-70" />
            SAHATE Kejari Cimahi
          </div>
          <h1 className="mt-4 text-3xl font-bold" style={{ color: "#f5c518" }}>
            Cek Status Laporan
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed" style={{ color: "#a8d5b5" }}>
            Gunakan nomor laporan untuk melihat progres penanganan pengaduan Anda secara mandiri.
          </p>
        </div>

        <StatusTracker initialNomorLaporan={params.nomor?.toUpperCase() ?? ""} />
      </div>
    </main>
  );
}
