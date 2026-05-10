import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/authz";
import { hasAdminSettingsUnlock } from "@/lib/admin-settings-gate";
import { APP_KEY_PTSP_PIN } from "@/lib/app-settings-constants";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/schema";

export async function GET() {
  const user = await getAuthenticatedUser(await headers());
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await hasAdminSettingsUnlock())) {
    return NextResponse.json({ error: "Kunci pengaturan diperlukan" }, { status: 403 });
  }

  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, APP_KEY_PTSP_PIN))
    .limit(1);

  return NextResponse.json({
    configuredInDatabase: Boolean(row?.value?.trim()),
    envFallbackUsed: !row?.value?.trim(),
  });
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(await headers());
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await hasAdminSettingsUnlock())) {
    return NextResponse.json({ error: "Kunci pengaturan diperlukan" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { pin?: string } | null;
  const pin = body?.pin?.trim() ?? "";
  if (!/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: "PIN harus 4–8 digit angka" }, { status: 400 });
  }

  await db
    .insert(appSettings)
    .values({
      key: APP_KEY_PTSP_PIN,
      value: pin,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: pin, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true });
}
