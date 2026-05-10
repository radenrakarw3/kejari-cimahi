import { NextRequest, NextResponse } from "next/server";
import { clearPtspAccess, grantPtspAccess, isValidPtspPin } from "@/lib/ptsp-auth";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { pin?: string } | null;
  const pin = body?.pin?.trim() ?? "";

  if (!(await isValidPtspPin(pin))) {
    return NextResponse.json({ error: "PIN PTSP tidak valid" }, { status: 401 });
  }

  return grantPtspAccess(NextResponse.json({ success: true }));
}

export async function DELETE() {
  return clearPtspAccess(NextResponse.json({ success: true }));
}
