"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua Status" },
  { value: "masuk", label: "Masuk" },
  { value: "diproses", label: "Diproses" },
  { value: "disposisi", label: "Disposisi" },
  { value: "selesai", label: "Selesai" },
];

const SOURCE_OPTIONS = [
  { value: "all", label: "Semua Sumber" },
  { value: "web", label: "Website" },
  { value: "wa", label: "WhatsApp" },
  { value: "offline", label: "Offline" },
];

interface LaporanFiltersProps {
  initialParams: Record<string, string | undefined>;
}

const inputStyle = {
  backgroundColor: "#0d4d22",
  borderColor: "rgba(240,180,41,0.25)",
  color: "#c8e6d0",
};

const selectContentStyle = {
  backgroundColor: "#0a3d1a",
  borderColor: "rgba(240,180,41,0.2)",
};

export function LaporanFilters({ initialParams }: LaporanFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [searchVal, setSearchVal] = useState(initialParams.search ?? "");

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const current = new URLSearchParams();
      Object.entries(initialParams).forEach(([k, v]) => { if (v) current.set(k, v); });
      Object.entries(updates).forEach(([k, v]) => {
        if (v && v !== "all") current.set(k, v);
        else current.delete(k);
      });
      current.delete("page");
      startTransition(() => { router.push(`${pathname}?${current.toString()}`); });
    },
    [initialParams, pathname, router]
  );

  const handleSearch = useDebouncedCallback((value: string) => {
    updateParams({ search: value || undefined });
  }, 400);

  return (
    <div className="flex flex-wrap gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8d5b5" }} />
        <Input
          placeholder="Cari nama pelapor..."
          value={searchVal}
          onChange={(e) => { setSearchVal(e.target.value); handleSearch(e.target.value); }}
          className="pl-9 pr-9 h-10 rounded-xl text-sm placeholder:opacity-40"
          style={inputStyle}
        />
        {searchVal && (
          <button
            onClick={() => { setSearchVal(""); updateParams({ search: undefined }); }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "#a8d5b5" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Status filter */}
      <Select value={initialParams.status ?? "all"} onValueChange={(v) => updateParams({ status: v ?? undefined })}>
        <SelectTrigger className="w-44 h-10 rounded-xl text-sm" style={inputStyle}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent style={selectContentStyle}>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} style={{ color: "#c8e6d0" }}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Source filter */}
      <Select value={initialParams.source ?? "all"} onValueChange={(v) => updateParams({ source: v ?? undefined })}>
        <SelectTrigger className="w-44 h-10 rounded-xl text-sm" style={inputStyle}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent style={selectContentStyle}>
          {SOURCE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} style={{ color: "#c8e6d0" }}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
