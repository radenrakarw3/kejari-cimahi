import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authz";
import { ADMIN_SETTINGS_COOKIE } from "@/lib/admin-settings-gate";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req.headers);
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
