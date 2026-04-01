import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const currentUser = await getAuthenticatedUser(req.headers);

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user: currentUser });
}
