import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authz";
import {
  ADMIN_SETTINGS_COOKIE,
  getAdminSystemPin,
  pinsMatchConstantTime,
} from "@/lib/admin-settings-gate";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req.headers);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { pin?: string } | null;
  const pin = body?.pin ?? "";
  const expected = getAdminSystemPin();

  if (!pinsMatchConstantTime(pin, expected)) {
    return NextResponse.json({ error: "Kode pengaturan salah" }, { status: 403 });
  }

  const store = await cookies();
  store.set(ADMIN_SETTINGS_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 2,
  });

  return NextResponse.json({ ok: true });
}
