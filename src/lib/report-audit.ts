import { db } from "@/lib/db";
import { reportAuditLogs } from "@/lib/schema";

export async function createReportAuditLog(params: {
  reportId: number;
  action: string;
  summary: string;
  actorType?: "system" | "public" | "admin" | "bidang";
  actorId?: string | null;
  actorName?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  await db.insert(reportAuditLogs).values({
    reportId: params.reportId,
    action: params.action,
    summary: params.summary,
    actorType: params.actorType ?? "system",
    actorId: params.actorId ?? null,
    actorName: params.actorName ?? null,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
  });
}
