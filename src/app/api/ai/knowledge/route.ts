import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiKnowledgeEntries } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { generateAndStoreEmbedding } from "@/lib/ai";

const knowledgeSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter").max(120),
  content: z.string().min(10, "Isi minimal 10 karakter").max(4000),
  tags: z.string().max(200).optional().default(""),
  isActive: z.boolean().optional().default(true),
});

async function requireSession(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return null;
  }

  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await db
    .select()
    .from(aiKnowledgeEntries)
    .orderBy(desc(aiKnowledgeEntries.updatedAt));

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = knowledgeSchema.parse(body);

    const [entry] = await db
      .insert(aiKnowledgeEntries)
      .values({
        title: parsed.title,
        content: parsed.content,
        tags: parsed.tags || null,
        isActive: parsed.isActive ?? true,
      })
      .returning();

    const embeddingText = [parsed.title, parsed.content, parsed.tags].filter(Boolean).join(" ");
    generateAndStoreEmbedding(entry.id, embeddingText).catch(() => {});

    return NextResponse.json({ data: entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Gagal menyimpan bank data" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = Number(body?.id);
    const parsed = knowledgeSchema.extend({
      id: z.number().int().positive(),
    }).parse({
      ...body,
      id,
    });

    const [entry] = await db
      .update(aiKnowledgeEntries)
      .set({
        title: parsed.title,
        content: parsed.content,
        tags: parsed.tags || null,
        isActive: parsed.isActive ?? true,
        updatedAt: new Date(),
      })
      .where(eq(aiKnowledgeEntries.id, parsed.id))
      .returning();

    const embeddingText = [parsed.title, parsed.content, parsed.tags].filter(Boolean).join(" ");
    generateAndStoreEmbedding(entry.id, embeddingText).catch(() => {});

    return NextResponse.json({ data: entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Gagal memperbarui bank data" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  await db.delete(aiKnowledgeEntries).where(eq(aiKnowledgeEntries.id, id));
  return NextResponse.json({ ok: true });
}
