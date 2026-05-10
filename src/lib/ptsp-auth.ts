import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const PTSP_COOKIE_NAME = "ptsp_frontdesk_access";
const DEFAULT_PTSP_PIN = "1960";

function getExpectedPin() {
  return process.env.PTSP_FRONTDESK_PIN?.trim() || DEFAULT_PTSP_PIN;
}

export function isValidPtspPin(pin: string) {
  return pin.trim() === getExpectedPin();
}

export async function hasPtspAccess() {
  const store = await cookies();
  const token = store.get(PTSP_COOKIE_NAME)?.value;
  return token === "granted";
}

export async function requirePtspAccess() {
  const allowed = await hasPtspAccess();
  if (!allowed) {
    return NextResponse.json({ error: "Akses PTSP tidak valid" }, { status: 401 });
  }

  return null;
}

export function grantPtspAccess(response: NextResponse) {
  response.cookies.set(PTSP_COOKIE_NAME, "granted", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export function clearPtspAccess(response: NextResponse) {
  response.cookies.set(PTSP_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export function requestHasPtspAccess(req: NextRequest) {
  return req.cookies.get(PTSP_COOKIE_NAME)?.value === "granted";
}
