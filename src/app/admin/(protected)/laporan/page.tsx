import { Suspense } from "react";
import { LaporanTable } from "@/components/admin/laporan-table";
import { LaporanFilters } from "@/components/admin/laporan-filters";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#f5c518" }}>Laporan Masuk</h1>
          <p className="text-sm mt-1" style={{ color: "#a8d5b5" }}>Kelola semua laporan masyarakat</p>
        </div>
        <Link href="/ptsp">
          <Button
            className="font-semibold rounded-xl gap-2 text-sm"
            style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
          >
            Buka PTSP
          </Button>
        </Link>
      </div>

      <LaporanFilters initialParams={params} />

      <Suspense fallback={<TableLoading />}>
        <LaporanTable searchParams={params} />
      </Suspense>
    </div>
  );
}

function TableLoading() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-14 border-b animate-pulse" style={{ borderColor: "rgba(240,180,41,0.08)", backgroundColor: "#145228" }} />
      ))}
    </div>
  );
}
