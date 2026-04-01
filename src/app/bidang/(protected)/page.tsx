import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq, desc, sql } from "drizzle-orm";
import { Clock3, FileCheck2, FolderClock, MessageSquareText, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { categories, disposisi, reports } from "@/lib/schema";
import { getAuthenticatedUser } from "@/lib/authz";
import { BidangDashboardClient } from "../page-client";

export const dynamic = "force-dynamic";

export default async function BidangPage() {
  const currentUser = await getAuthenticatedUser(await headers());

  if (!currentUser) {
    redirect("/bidang/login");
  }

  if (!currentUser.bidangId) {
    redirect("/admin/dashboard");
  }

  const latestDisposisi = db
    .select({
      reportId: disposisi.reportId,
      latestId: sql<number>`max(${disposisi.id})`.as("latest_id"),
    })
    .from(disposisi)
    .groupBy(disposisi.reportId)
    .as("latest_disposisi");

  const assignedReports = await db
    .select({
      id: reports.id,
      nomorLaporan: reports.nomorLaporan,
      nama: reports.nama,
      nomorWa: reports.nomorWa,
      kelurahan: reports.kelurahan,
      rw: reports.rw,
      isiLaporan: reports.isiLaporan,
      status: reports.status,
      createdAt: reports.createdAt,
      updatedAt: reports.updatedAt,
      kategoriNama: categories.nama,
      kategoriWarna: categories.warna,
      catatanDisposisi: disposisi.catatan,
      disposedAt: disposisi.disposedAt,
    })
    .from(reports)
    .innerJoin(latestDisposisi, eq(reports.id, latestDisposisi.reportId))
    .innerJoin(disposisi, eq(disposisi.id, latestDisposisi.latestId))
    .leftJoin(categories, eq(reports.kategoriId, categories.id))
    .where(eq(disposisi.bidangId, currentUser.bidangId))
    .orderBy(desc(disposisi.disposedAt));

  const stats = {
    total: assignedReports.length,
    disposisi: assignedReports.filter((report) => report.status === "disposisi").length,
    diproses: assignedReports.filter((report) => report.status === "diproses").length,
    selesai: assignedReports.filter((report) => report.status === "selesai").length,
  };

  const cards = [
    { label: "Total Disposisi", value: stats.total, icon: FolderClock, color: "#f0b429", bg: "rgba(240,180,41,0.10)" },
    { label: "Menunggu Proses", value: stats.disposisi, icon: Clock3, color: "#f5c518", bg: "rgba(245,197,24,0.10)" },
    { label: "Sedang Diproses", value: stats.diproses, icon: MessageSquareText, color: "#86efac", bg: "rgba(134,239,172,0.10)" },
    { label: "Sudah Selesai", value: stats.selesai, icon: FileCheck2, color: "#4ade80", bg: "rgba(74,222,128,0.10)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] font-semibold" style={{ color: "#f0b429" }}>
            Bidang {currentUser.bidangKode ?? ""}
          </div>
          <h1 className="text-2xl font-bold mt-1" style={{ color: "#f5c518" }}>
            Tindak Lanjut Disposisi
          </h1>
          <p className="text-sm mt-1 max-w-2xl" style={{ color: "#a8d5b5" }}>
            Kelola laporan yang dikirim admin ke bidang Anda, tandai saat mulai diproses, lalu selesaikan agar admin dan warga langsung mendapat pembaruan.
          </p>
        </div>

        <div
          className="rounded-2xl px-4 py-3"
          style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.16)" }}
        >
          <div className="flex items-center gap-2 text-sm" style={{ color: "#c8e6d0" }}>
            <UserRound className="w-4 h-4" style={{ color: "#f0b429" }} />
            <span className="font-semibold">{currentUser.name}</span>
          </div>
          <div className="text-xs mt-1" style={{ color: "rgba(168,213,181,0.7)" }}>
            {currentUser.bidangNama}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl p-5"
            style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: card.bg }}
            >
              <card.icon className="w-5 h-5" style={{ color: card.color }} />
            </div>
            <div className="text-3xl font-bold mt-4" style={{ color: "#f5c518" }}>
              {card.value}
            </div>
            <div className="text-sm mt-1" style={{ color: "#a8d5b5" }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      <BidangDashboardClient
        bidangNama={currentUser.bidangNama}
        reports={assignedReports}
      />
    </div>
  );
}
