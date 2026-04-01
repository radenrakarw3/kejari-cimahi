"use client";

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, CartesianGrid, Legend,
} from "recharts";

interface StatsChartsClientProps {
  byCategory: Array<{ kategoriId: number | null; kategoriNama: string | null; kategoriWarna: string | null; total: number }>;
  byKelurahan: Array<{ kelurahan: string; total: number }>;
  trend: Array<{ key: string; label: string; total: number; web: number; wa: number; offline: number; selesai: number }>;
  monthly: Array<{ key: string; label: string; total: number; web: number; wa: number; offline: number; selesai: number }>;
  bySource: Array<{ source: string; total: number }>;
  byStatus: Array<{ status: string; total: number }>;
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

const STATUS_COLORS: Record<string, string> = {
  masuk: "#f5c518",
  diproses: "#f0b429",
  disposisi: "#86efac",
  selesai: "#4ade80",
};

const SOURCE_LABELS: Record<string, string> = {
  web: "Web",
  wa: "WhatsApp",
  offline: "PTSP",
};

export function StatsChartsClient({ byCategory, byKelurahan, trend, monthly, bySource, byStatus }: StatsChartsClientProps) {
  const categoryData = byCategory.map((c, i) => ({
    name: c.kategoriNama ?? "Belum Dikategorikan",
    value: Number(c.total),
    color: c.kategoriWarna ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const kelurahanData = byKelurahan.map((k) => ({
    kelurahan: k.kelurahan.length > 14 ? k.kelurahan.slice(0, 14) + "…" : k.kelurahan,
    total: Number(k.total),
  }));

  const trendData = trend.map((item) => ({
    label: item.label,
    Masuk: Number(item.total),
    Selesai: Number(item.selesai),
    Web: Number(item.web),
    WA: Number(item.wa),
    PTSP: Number(item.offline),
  }));

  const monthlyData = monthly.map((item) => ({
    label: item.label,
    Total: Number(item.total),
    Web: Number(item.web),
    WA: Number(item.wa),
    PTSP: Number(item.offline),
    Selesai: Number(item.selesai),
  }));

  const sourceData = bySource.map((item, index) => ({
    name: SOURCE_LABELS[item.source] ?? item.source.toUpperCase(),
    value: Number(item.total),
    color: ["#f0b429", "#4ade80", "#60a5fa"][index % 3],
  }));

  const statusData = byStatus.map((item) => ({
    name: item.status,
    value: Number(item.total),
    color: STATUS_COLORS[item.status] ?? "#a8d5b5",
  }));

  const cardStyle = { backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "#f5c518" }}>Arus Laporan 30 Hari</h3>
            <p className="text-[11px] mt-1" style={{ color: "#a8d5b5" }}>
              Perbandingan laporan masuk dan selesai dengan label tanggal Jakarta.
            </p>
          </div>
        </div>
        {trendData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm" style={{ color: "#a8d5b5" }}>
            Belum ada data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="masukGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f0b429" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f0b429" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="selesaiGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,180,41,0.08)" />
              <XAxis dataKey="label" tick={{ fill: "#a8d5b5", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#a8d5b5", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Area type="monotone" dataKey="Masuk" stroke="#f0b429" strokeWidth={2.4} fill="url(#masukGradient)" />
              <Area type="monotone" dataKey="Selesai" stroke="#4ade80" strokeWidth={2.2} fill="url(#selesaiGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "#f5c518" }}>Tren Bulanan 6 Bulan</h3>
            <p className="text-[11px] mt-1" style={{ color: "#a8d5b5" }}>
              Distribusi kanal masuk per bulan dengan acuan kalender Jakarta.
            </p>
          </div>
        </div>
        {monthlyData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-sm" style={{ color: "#a8d5b5" }}>
            Belum ada data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,180,41,0.08)" />
              <XAxis dataKey="label" tick={{ fill: "#a8d5b5", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a8d5b5", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="Web" stackId="month" fill="#f0b429" radius={[4, 4, 0, 0]} />
              <Bar dataKey="WA" stackId="month" fill="#4ade80" />
              <Bar dataKey="PTSP" stackId="month" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

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

      <div className="rounded-2xl p-5" style={cardStyle}>
        <h3 className="font-semibold text-sm mb-4" style={{ color: "#f5c518" }}>Status dan Kanal Masuk</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {statusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm" style={{ color: "#a8d5b5" }}>
                Belum ada data
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={68}>
                      {statusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {statusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span style={{ color: "#c8e6d0" }}>{item.name}</span>
                      </div>
                      <span style={{ color: "#f0b429" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            {sourceData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm" style={{ color: "#a8d5b5" }}>
                Belum ada data
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" cx="50%" cy="50%" innerRadius={34} outerRadius={66}>
                      {sourceData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {sourceData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span style={{ color: "#c8e6d0" }}>{item.name}</span>
                      </div>
                      <span style={{ color: "#f0b429" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
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

      <div className="rounded-2xl p-5" style={cardStyle}>
        <h3 className="font-semibold text-sm mb-4" style={{ color: "#f5c518" }}>Komposisi Harian per Kanal</h3>
        {trendData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-sm" style={{ color: "#a8d5b5" }}>
            Belum ada data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(240,180,41,0.08)" />
              <XAxis dataKey="label" tick={{ fill: "#a8d5b5", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: "#a8d5b5", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="Web" stackId="day" fill="#f0b429" radius={[4, 4, 0, 0]} />
              <Bar dataKey="WA" stackId="day" fill="#4ade80" />
              <Bar dataKey="PTSP" stackId="day" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
