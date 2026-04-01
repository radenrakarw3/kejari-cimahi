import { NextRequest, NextResponse } from "next/server";
import { generateWaReply } from "@/lib/ai";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { kategori, isiLaporan } = await req.json();
    const templates = await generateWaReply(kategori, isiLaporan);
    return NextResponse.json({ templates });
  } catch (err) {
    console.error("Generate reply error:", err);
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }
}
