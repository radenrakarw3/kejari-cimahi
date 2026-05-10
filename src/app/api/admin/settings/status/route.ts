import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authz";
import { hasAdminSettingsUnlock } from "@/lib/admin-settings-gate";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request.headers);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unlocked = await hasAdminSettingsUnlock();
  return NextResponse.json({ unlocked });
}
