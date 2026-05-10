import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { bidang, ptspAppointments } from "@/lib/schema";
import { getAuthenticatedUser } from "@/lib/authz";
import { getJakartaDayRange } from "@/lib/ptsp";

export async function GET(req: NextRequest) {
  const currentUser = await getAuthenticatedUser(req.headers);
  if (!currentUser || !currentUser.bidangId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { start, end } = getJakartaDayRange();
  const rows = await db
    .select({
      id: ptspAppointments.id,
      hostName: ptspAppointments.hostName,
      visitorName: ptspAppointments.visitorName,
      visitorPhone: ptspAppointments.visitorPhone,
      agenda: ptspAppointments.agenda,
      note: ptspAppointments.note,
      scheduledFor: ptspAppointments.scheduledFor,
      isIncognito: ptspAppointments.isIncognito,
      status: ptspAppointments.status,
      confirmedAt: ptspAppointments.confirmedAt,
      bidangNama: bidang.nama,
    })
    .from(ptspAppointments)
    .innerJoin(bidang, eq(ptspAppointments.bidangId, bidang.id))
    .where(
      and(
        eq(ptspAppointments.bidangId, currentUser.bidangId),
        gte(ptspAppointments.scheduledFor, start),
        lt(ptspAppointments.scheduledFor, end)
      )
    )
    .orderBy(asc(ptspAppointments.scheduledFor), desc(ptspAppointments.createdAt));

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const currentUser = await getAuthenticatedUser(req.headers);
  if (!currentUser || !currentUser.bidangId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        hostName?: string;
        visitorName?: string;
        visitorPhone?: string;
        agenda?: string;
        note?: string;
        scheduledFor?: string;
        isIncognito?: boolean;
      }
    | null;

  const hostName = body?.hostName?.trim() ?? "";
  const visitorName = body?.visitorName?.trim() ?? "";
  const visitorPhone = body?.visitorPhone?.trim() ?? "";
  const agenda = body?.agenda?.trim() ?? "";
  const note = body?.note?.trim() ?? "";
  const scheduledForRaw = body?.scheduledFor?.trim() ?? "";
  const scheduledFor = scheduledForRaw ? new Date(scheduledForRaw) : null;

  if (!hostName || !visitorName || !agenda || !scheduledFor || Number.isNaN(scheduledFor.getTime())) {
    return NextResponse.json({ error: "Data janji temu belum lengkap" }, { status: 400 });
  }

  const [appointment] = await db
    .insert(ptspAppointments)
    .values({
      bidangId: currentUser.bidangId,
      hostName,
      visitorName,
      visitorPhone: visitorPhone || null,
      agenda,
      note: note || null,
      scheduledFor,
      isIncognito: body?.isIncognito === true,
      status: "scheduled",
      createdBy: currentUser.id,
    })
    .returning({ id: ptspAppointments.id });

  return NextResponse.json({ id: appointment.id }, { status: 201 });
}
