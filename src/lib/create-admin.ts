import { config } from "dotenv";
config({ path: ".env.local" });
import { eq } from "drizzle-orm";
import { db } from "./db";
import { user } from "./schema";

// This script creates the first admin user
// Run: npx tsx --env-file=.env.local src/lib/create-admin.ts

const APP_URL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function main() {
  const email = process.argv[2] ?? "admin@kejari-cimahi.go.id";
  const password = process.argv[3] ?? "Admin123!";
  const name = process.argv[4] ?? "Admin Kejari Cimahi";

  console.log(`Creating admin: ${email}`);

  const res = await fetch(`${APP_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": APP_URL,
    },
    body: JSON.stringify({ email, password, name }),
  });

  const text = await res.text();
  console.log(`Status: ${res.status}`);

  let data: Record<string, unknown> = {};
  try { data = JSON.parse(text); } catch { console.log("Raw:", text); }

  if (res.ok) {
    const createdEmail = ((data.user as Record<string, unknown>)?.email ?? email) as string;
    await db
      .update(user)
      .set({ role: "admin", bidangId: null, updatedAt: new Date() })
      .where(eq(user.email, createdEmail));
    console.log("✅ Admin created:", (data.user as Record<string, unknown>)?.email ?? data);
  } else {
    console.error("❌ Failed:", data.message ?? text);
  }
  process.exit(0);
}

main();
