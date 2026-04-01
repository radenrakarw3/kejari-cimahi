"use client";

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, CartesianGrid, Legend,
} from "recharts";

interface StatsChartsClientProps {
  byCategory: Array<{ kategoriId: number | null; kategoriNama: string | null; kategoriWarna: string | null; total: number }>;
  byKelurahan: Array<{ kelurahan: string; total: number }>;
  trend: Array<{ date: string; total: number; web: number; wa: number }>;
  bySource: Array<{ source: string; total: number }>;
}

const tooltipStyle = {
  backgroundColor: "#0a3d1a",
  border: "1px solid rgba(240,180,41,0.2)",
  borderRadius: "12px",
  color: "#c8e6d0",
  fontSize: "12px",
};

// Green/gold palette for categories
const CATEGORY_COLORS = [
  "#f0b429", "#86efac", "#4ade80", "#f5c518", "#a8d5b5",
  "#c8e6d0", "#fbbf24", "#6ee7b7", "#fcd34d", "#34d399",
];

export function StatsChartsClient({ byCategory, byKelurahan, trend }: StatsChartsClientProps) {
  const categoryData = byCategory.map((c, i) => ({
    name: c.kategoriNama ?? "Belum Dikategorikan",
    value: Number(c.total),
    color: c.kategoriWarna ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const kelurahanData = byKelurahan.map((k) => ({
    kelurahan: k.kelurahan.length > 14 ? k.kelurahan.slice(0, 14) + "…" : k.kelurahan,
    total: Number(k.total),
  }));

  const trendData = trend.map((t) => ({
    date: new Date(t.date).toLocaleDateString("id-ID", { month: "short", day: "numeric" }),
    Total: Number(t.total),
    Web: Number(t.web),
    WA: Number(t.wa),
  }));

  const cardStyle = { backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Category Pie */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <h3 className="font-semibold text-sm mb-4" style={{ color: "#f5c518" }}>Kategori Laporan</h3>
        {categoryData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm" style={{ color: "#a8d5b5" }}>
            Belum ada data
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {categoryData.slice(0, 5).map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate max-w-[130px]" style={{ color: "#c8e6d0" }}>{cat.name}</span>
                  </div>
                  <span className="font-semibold" style={{ color: "#f0b429" }}>{cat.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Kelurahan Bar */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <h3 className="font-semibold text-sm mb-4" style={{ color: "#f5c518" }}>Laporan per Kelurahan</h3>
        {kelurahanData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm" style={{ color: "#a8d5b5" }}>
            Belum ada data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={kelurahanData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tick={{ fill: "#a8d5b5", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="kelurahan" tick={{ fill: "#a8d5b5", fontSize: 10 }} width={90} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="total" fill="#f0b429" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Trend Area */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <h3 className="font-semibold text-sm mb-4" style={{ color: "#f5c518" }}>Tren 30 Hari Terakhir</h3>
        {trendData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm" style={{ color: "#a8d5b5" }}>
            Belum ada data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f0b429" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f0b429" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorWa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,180,41,0.08)" />
              <XAxis dataKey="date" tick={{ fill: "#a8d5b5", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#a8d5b5", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px", color: "#a8d5b5" }} />
              <Area type="monotone" dataKey="Web" stroke="#f0b429" strokeWidth={2} fill="url(#colorWeb)" />
              <Area type="monotone" dataKey="WA" stroke="#4ade80" strokeWidth={2} fill="url(#colorWa)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
