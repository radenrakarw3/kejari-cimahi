import { db } from "@/lib/db";
import { skm } from "@/lib/schema";
import { desc, count, avg } from "drizzle-orm";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Star, BarChart2, Users, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

const SKM_LABELS = [
  "Persyaratan",
  "Prosedur",
  "Waktu Penyelesaian",
  "Biaya/Tarif",
  "Produk Layanan",
  "Kompetensi Pelaksana",
  "Perilaku Pelaksana",
  "Penanganan Pengaduan",
  "Sarana & Prasarana",
];

function getPredikat(ikm: number) {
  if (ikm >= 88.31) return { label: "Sangat Baik", color: "#4ade80" };
  if (ikm >= 76.61) return { label: "Baik", color: "#f0b429" };
  if (ikm >= 65.00) return { label: "Kurang Baik", color: "#fb923c" };
  return { label: "Tidak Baik", color: "#f87171" };
}

export default async function SkmPage() {
  const [totalResult, avgResult, recent] = await Promise.all([
    db.select({ total: count() }).from(skm),
    db.select({
      a1: avg(skm.u1), a2: avg(skm.u2), a3: avg(skm.u3),
      a4: avg(skm.u4), a5: avg(skm.u5), a6: avg(skm.u6),
      a7: avg(skm.u7), a8: avg(skm.u8), a9: avg(skm.u9),
    }).from(skm),
    db.select().from(skm).orderBy(desc(skm.createdAt)).limit(50),
  ]);

  const total = totalResult[0]?.total ?? 0;
  const avgs = avgResult[0];

  const unsurAvg = [
    Number(avgs?.a1 ?? 0), Number(avgs?.a2 ?? 0), Number(avgs?.a3 ?? 0),
    Number(avgs?.a4 ?? 0), Number(avgs?.a5 ?? 0), Number(avgs?.a6 ?? 0),
    Number(avgs?.a7 ?? 0), Number(avgs?.a8 ?? 0), Number(avgs?.a9 ?? 0),
  ];

  // IKM calculation: NRR per unsur × (1/9) bobot → sum × 25
  const ikm = total > 0
    ? unsurAvg.reduce((sum, v) => sum + v, 0) / 9 * 25
    : 0;

  const predikat = getPredikat(ikm);

  const cardStyle = { backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f5c518" }}>Survey Kepuasan Masyarakat</h1>
        <p className="text-sm mt-1" style={{ color: "#a8d5b5" }}>
          Indeks Kepuasan Masyarakat (IKM) — Permenpan RB No. 14/2017
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* IKM Score */}
        <div className="rounded-2xl p-6 sm:col-span-1 flex flex-col items-center justify-center text-center" style={cardStyle}>
          <div className="text-5xl font-extrabold mb-1" style={{ color: predikat.color }}>
            {total > 0 ? ikm.toFixed(2) : "—"}
          </div>
          <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: predikat.color }}>
            {total > 0 ? predikat.label : "Belum ada data"}
          </div>
          <div className="text-xs" style={{ color: "rgba(168,213,181,0.5)" }}>Nilai IKM (0–100)</div>
        </div>

        {/* Responden */}
        <div className="rounded-2xl p-5 flex items-center gap-4" style={cardStyle}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(240,180,41,0.15)" }}>
            <Users className="w-6 h-6" style={{ color: "#f0b429" }} />
          </div>
          <div>
            <div className="text-3xl font-bold" style={{ color: "#f5c518" }}>{total.toLocaleString("id-ID")}</div>
            <div className="text-xs" style={{ color: "#a8d5b5" }}>Total Responden</div>
          </div>
        </div>

        {/* Rata-rata bintang */}
        <div className="rounded-2xl p-5 flex items-center gap-4" style={cardStyle}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(240,180,41,0.15)" }}>
            <Star className="w-6 h-6" style={{ color: "#f0b429" }} />
          </div>
          <div>
            <div className="text-3xl font-bold" style={{ color: "#f5c518" }}>
              {total > 0 ? (unsurAvg.reduce((a, b) => a + b, 0) / 9).toFixed(2) : "—"}
            </div>
            <div className="text-xs" style={{ color: "#a8d5b5" }}>Rata-rata Nilai (1–4)</div>
          </div>
        </div>
      </div>

      {/* Per-unsur bars */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 className="w-4 h-4" style={{ color: "#f0b429" }} />
          <h3 className="font-semibold text-sm" style={{ color: "#f5c518" }}>Nilai Per Unsur Layanan</h3>
        </div>
        {total === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: "#a8d5b5" }}>Belum ada data survey</div>
        ) : (
          <div className="space-y-3">
            {SKM_LABELS.map((label, i) => {
              const val = unsurAvg[i] ?? 0;
              const pct = (val / 4) * 100;
              const barColor = val >= 3.5 ? "#4ade80" : val >= 2.5 ? "#f0b429" : "#fb923c";
              return (
                <div key={label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: "#c8e6d0" }}>
                      <span style={{ color: "rgba(240,180,41,0.6)" }}>U{i + 1}</span> {label}
                    </span>
                    <span className="font-bold ml-2 flex-shrink-0" style={{ color: barColor }}>
                      {val.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(240,180,41,0.1)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Skala referensi */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: "#145228", border: "1px solid rgba(240,180,41,0.12)" }}>
        <div className="text-xs font-semibold mb-2" style={{ color: "#f0b429" }}>Referensi Nilai IKM</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {[
            { range: "88.31 – 100.00", label: "Sangat Baik", color: "#4ade80" },
            { range: "76.61 – 88.30", label: "Baik", color: "#f0b429" },
            { range: "65.00 – 76.60", label: "Kurang Baik", color: "#fb923c" },
            { range: "25.00 – 64.99", label: "Tidak Baik", color: "#f87171" },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
              <div>
                <div className="font-semibold" style={{ color: r.color }}>{r.label}</div>
                <div style={{ color: "rgba(168,213,181,0.5)" }}>{r.range}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent responses table */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "rgba(240,180,41,0.12)" }}>
          <TrendingUp className="w-4 h-4" style={{ color: "#f0b429" }} />
          <h3 className="font-semibold text-sm" style={{ color: "#f5c518" }}>Riwayat Survey ({recent.length} terbaru)</h3>
        </div>

        {recent.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "#a8d5b5" }}>Belum ada data survey</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: "rgba(240,180,41,0.06)", borderBottom: "1px solid rgba(240,180,41,0.1)" }}>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider" style={{ color: "rgba(168,213,181,0.6)" }}>Tgl</th>
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider" style={{ color: "rgba(168,213,181,0.6)" }}>No. Laporan</th>
                  {["U1","U2","U3","U4","U5","U6","U7","U8","U9"].map(u => (
                    <th key={u} className="text-center px-2 py-3 font-semibold uppercase tracking-wider" style={{ color: "rgba(168,213,181,0.6)" }}>{u}</th>
                  ))}
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider" style={{ color: "rgba(168,213,181,0.6)" }}>Saran</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row, i) => {
                  const rowAvg = ([row.u1, row.u2, row.u3, row.u4, row.u5, row.u6, row.u7, row.u8, row.u9].reduce((a, b) => a + b, 0) / 9);
                  const rowColor = rowAvg >= 3.5 ? "#4ade80" : rowAvg >= 2.5 ? "#f0b429" : "#fb923c";
                  return (
                    <tr
                      key={row.id}
                      style={{ borderBottom: i < recent.length - 1 ? "1px solid rgba(240,180,41,0.07)" : "none" }}
                    >
                      <td className="px-4 py-3" style={{ color: "rgba(168,213,181,0.5)" }}>
                        {row.createdAt ? format(new Date(row.createdAt), "dd MMM yy", { locale: id }) : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: "#a8d5b5" }}>#{row.reportId}</td>
                      {[row.u1, row.u2, row.u3, row.u4, row.u5, row.u6, row.u7, row.u8, row.u9].map((v, j) => (
                        <td key={j} className="text-center px-2 py-3">
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: v >= 4 ? "rgba(74,222,128,0.15)" : v >= 3 ? "rgba(240,180,41,0.15)" : "rgba(248,113,113,0.15)",
                              color: v >= 4 ? "#4ade80" : v >= 3 ? "#f0b429" : "#f87171",
                            }}
                          >
                            {v}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-3 max-w-[150px]" style={{ color: "#a8d5b5" }}>
                        <span className="truncate block">{row.saran || "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
