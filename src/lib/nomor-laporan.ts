import { db } from "./db";
import { reports } from "./schema";
import { like, count } from "drizzle-orm";

export async function generateNomorLaporan(): Promise<string> {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;

  const prefix = `LPKC-${dateStr}-`;

  const result = await db
    .select({ total: count() })
    .from(reports)
    .where(like(reports.nomorLaporan, `${prefix}%`));

  const seq = String((result[0]?.total ?? 0) + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}
