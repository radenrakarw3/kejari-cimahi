import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authz";

export async function GET() {
  const currentUser = await getAuthenticatedUser(await headers());

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user: currentUser });
}
