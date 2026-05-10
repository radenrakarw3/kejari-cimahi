import { NextResponse } from "next/server";
import { hasPtspAccess } from "@/lib/ptsp-auth";

export async function GET() {
  return NextResponse.json({ authenticated: await hasPtspAccess() });
}
