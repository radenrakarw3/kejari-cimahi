import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authz";
import { ADMIN_SETTINGS_COOKIE } from "@/lib/admin-settings-gate";

export async function POST() {
  const user = await getAuthenticatedUser(await headers());
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await cookies();
  store.set(ADMIN_SETTINGS_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
