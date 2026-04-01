import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiAssistantSettings } from "@/lib/schema";

const settingsSchema = z.object({
  toneMode: z.enum(["formal", "warm", "calming", "balanced"]),
});

async function requireSession(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  return session ?? null;
}

async function getOrCreateSettings() {
  try {
    const existing = await db.select().from(aiAssistantSettings).where(eq(aiAssistantSettings.id, 1)).limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const [created] = await db
      .insert(aiAssistantSettings)
      .values({
        id: 1,
        toneMode: "balanced",
      })
      .returning();

    return created;
  } catch (error) {
    console.error("[ai/settings] fallback settings used:", error);
    return {
      id: 1,
      toneMode: "balanced" as const,
      createdAt: null,
      updatedAt: null,
    };
  }
}

export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getOrCreateSettings();
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = settingsSchema.parse(body);

    const current = await getOrCreateSettings();

    const [updated] = await db
      .update(aiAssistantSettings)
      .set({
        toneMode: parsed.toneMode,
        updatedAt: new Date(),
      })
      .where(eq(aiAssistantSettings.id, current.id))
      .returning();

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Gagal memperbarui pengaturan AI" }, { status: 500 });
  }
}
