import { NextRequest, NextResponse } from "next/server";
import { categorizeReport } from "@/lib/ai";
import { db } from "@/lib/db";
import { reports, categories } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { reportId, isiLaporan } = await req.json();

    if (!isiLaporan) {
      return NextResponse.json({ error: "isiLaporan required" }, { status: 400 });
    }

    const result = await categorizeReport(isiLaporan);

    // If called with reportId, update the report
    if (reportId) {
      // Find category by kode
      const [cat] = await db
        .select()
        .from(categories)
        .where(eq(categories.kode, result.kategori));

      const updateData: Record<string, unknown> = {
        aiCategorySuggestion: result.kategori,
        aiConfidenceScore: String(result.confidence),
        aiAlasan: result.alasan,
        updatedAt: new Date(),
      };

      // Auto-apply if confidence > 0.80
      if (cat && result.confidence > 0.8) {
        updateData.kategoriId = cat.id;
      }

      await db
        .update(reports)
        .set(updateData)
        .where(eq(reports.id, reportId));
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("AI categorize error:", err);
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }
}
