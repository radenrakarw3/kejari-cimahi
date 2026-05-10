import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authz";
import { hasAdminSettingsUnlock } from "@/lib/admin-settings-gate";
import { db } from "@/lib/db";
import { bidang, user } from "@/lib/schema";

export async function GET() {
  const current = await getAuthenticatedUser(await headers());
  if (!current || current.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await hasAdminSettingsUnlock())) {
    return NextResponse.json({ error: "Kunci pengaturan diperlukan" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      bidangKode: bidang.kode,
      bidangNama: bidang.nama,
    })
    .from(user)
    .innerJoin(bidang, eq(user.bidangId, bidang.id))
    .where(eq(user.role, "bidang"));

  return NextResponse.json({ users: rows });
}
