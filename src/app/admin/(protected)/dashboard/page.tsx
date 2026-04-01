import { Suspense } from "react";
import { DashboardStats } from "@/components/admin/dashboard-stats";
import { RecentReports } from "@/components/admin/recent-reports";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f5c518" }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "#a8d5b5" }}>Ringkasan laporan masyarakat Kejari Cimahi</p>
      </div>

      <Suspense fallback={<StatsLoading />}>
        <DashboardStats />
      </Suspense>

      <Suspense fallback={
        <div className="h-64 rounded-2xl animate-pulse" style={{ backgroundColor: "#145228" }} />
      }>
        <RecentReports />
      </Suspense>
    </div>
  );
}

function StatsLoading() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ backgroundColor: "#145228" }} />
      ))}
    </div>
  );
}
