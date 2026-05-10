const OPEN_STATUSES = new Set(["masuk", "disposisi", "diproses"]);

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  rendah: { label: "Rendah", color: "#93c5fd", bg: "rgba(147,197,253,0.14)" },
  normal: { label: "Normal", color: "#a8d5b5", bg: "rgba(168,213,181,0.12)" },
  penting: { label: "Penting", color: "#f0b429", bg: "rgba(240,180,41,0.14)" },
  mendesak: { label: "Mendesak", color: "#fb923c", bg: "rgba(251,146,60,0.14)" },
  kritis: { label: "Kritis", color: "#f87171", bg: "rgba(248,113,113,0.14)" },
};

export function getPriorityConfig(level: string | null | undefined) {
  return PRIORITY_CONFIG[level ?? "normal"] ?? PRIORITY_CONFIG.normal;
}

function getSlaThresholdHours(status: string) {
  switch (status) {
    case "masuk":
      return { warning: 24, overdue: 48 };
    case "disposisi":
      return { warning: 48, overdue: 72 };
    case "diproses":
      return { warning: 120, overdue: 168 };
    default:
      return null;
  }
}

export function getSlaState(params: {
  status: string;
  createdAt: Date | string | null;
  updatedAt?: Date | string | null;
}) {
  if (!OPEN_STATUSES.has(params.status) || !params.createdAt) {
    return {
      key: "closed",
      label: "Selesai / Tidak Aktif",
      color: "#4ade80",
      bg: "rgba(74,222,128,0.12)",
      ageHours: 0,
    };
  }

  const thresholds = getSlaThresholdHours(params.status);
  const startedAt = new Date(params.status === "diproses" && params.updatedAt ? params.updatedAt : params.createdAt);
  const ageHours = Math.max(0, (Date.now() - startedAt.getTime()) / (1000 * 60 * 60));

  if (!thresholds) {
    return {
      key: "unknown",
      label: "Belum Ada SLA",
      color: "#a8d5b5",
      bg: "rgba(168,213,181,0.12)",
      ageHours,
    };
  }

  if (ageHours >= thresholds.overdue) {
    return {
      key: "overdue",
      label: "Melewati SLA",
      color: "#f87171",
      bg: "rgba(248,113,113,0.14)",
      ageHours,
    };
  }

  if (ageHours >= thresholds.warning) {
    return {
      key: "warning",
      label: "Mendekati SLA",
      color: "#fb923c",
      bg: "rgba(251,146,60,0.14)",
      ageHours,
    };
  }

  return {
    key: "safe",
    label: "Dalam SLA",
    color: "#86efac",
    bg: "rgba(134,239,172,0.12)",
    ageHours,
  };
}
