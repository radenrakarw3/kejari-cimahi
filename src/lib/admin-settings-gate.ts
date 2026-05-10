import { cookies } from "next/headers";

export const ADMIN_SETTINGS_COOKIE = "sahate_admin_settings_ok";

export function getAdminSystemPin(): string {
  return process.env.ADMIN_SYSTEM_PIN?.trim() || "664599";
}

export async function hasAdminSettingsUnlock(): Promise<boolean> {
  const c = await cookies();
  return c.get(ADMIN_SETTINGS_COOKIE)?.value === "1";
}

export function pinsMatchConstantTime(input: string, expected: string): boolean {
  const a = input.trim();
  const b = expected.trim();
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) {
    x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return x === 0;
}
