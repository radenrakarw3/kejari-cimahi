import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authz";
import { hasAdminSettingsUnlock } from "@/lib/admin-settings-gate";

export async function GET() {
  const user = await getAuthenticatedUser(await headers());
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unlocked = await hasAdminSettingsUnlock();
  return NextResponse.json({ unlocked });
}
