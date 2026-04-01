import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { skm } from "@/lib/schema";
import { z } from "zod";

const skmSchema = z.object({
  reportId: z.number().int().positive(),
  u1: z.number().int().min(1).max(4),
  u2: z.number().int().min(1).max(4),
  u3: z.number().int().min(1).max(4),
  u4: z.number().int().min(1).max(4),
  u5: z.number().int().min(1).max(4),
  u6: z.number().int().min(1).max(4),
  u7: z.number().int().min(1).max(4),
  u8: z.number().int().min(1).max(4),
  u9: z.number().int().min(1).max(4),
  saran: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = skmSchema.parse(body);
    const [result] = await db.insert(skm).values(data).returning({ id: skm.id });
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal menyimpan survey" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const data = await db.select().from(skm).orderBy(skm.createdAt);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data" }, { status: 500 });
  }
}
