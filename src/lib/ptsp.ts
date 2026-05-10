import { and, count, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { ptspVisitLogs } from "@/lib/schema";

export function getJakartaDayRange(base = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = formatter.format(base).split("-");
  const start = new Date(`${year}-${month}-${day}T00:00:00+07:00`);
  const end = new Date(`${year}-${month}-${day}T23:59:59.999+07:00`);
  return { start, end };
}

export async function generateVisitorCardNumber() {
  const now = new Date();
  const { start, end } = getJakartaDayRange(now);
  const [result] = await db
    .select({ total: count() })
    .from(ptspVisitLogs)
    .where(and(gte(ptspVisitLogs.createdAt, start), lt(ptspVisitLogs.createdAt, end)));

  const sequence = String((result?.total ?? 0) + 1).padStart(3, "0");
  const dateCode = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replaceAll("-", "");

  return `VC-${dateCode}-${sequence}`;
}
