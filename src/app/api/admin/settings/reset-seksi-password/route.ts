import { eq, and } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authz";
import { hasAdminSettingsUnlock } from "@/lib/admin-settings-gate";
import { db } from "@/lib/db";
import { account, user } from "@/lib/schema";

export async function POST(req: Request) {
  const current = await getAuthenticatedUser(await headers());
  if (!current || current.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await hasAdminSettingsUnlock())) {
    return NextResponse.json({ error: "Kunci pengaturan diperlukan" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as
    | { userId?: string; newPassword?: string }
    | null;
  const userId = body?.userId?.trim();
  const newPassword = body?.newPassword?.trim() ?? "";

  if (!userId || newPassword.length < 8) {
    return NextResponse.json(
      { error: "userId dan newPassword (min. 8 karakter) wajib" },
      { status: 400 },
    );
  }

  const [target] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!target || target.role !== "bidang") {
    return NextResponse.json({ error: "Akun seksi tidak ditemukan" }, { status: 404 });
  }

  const [cred] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);

  if (!cred) {
    return NextResponse.json({ error: "Akun tidak memakai sandi (credential)" }, { status: 400 });
  }

  const hashed = await hashPassword(newPassword);
  await db
    .update(account)
    .set({
      password: hashed,
      updatedAt: new Date(),
    })
    .where(eq(account.id, cred.id));

  return NextResponse.json({ ok: true });
}
