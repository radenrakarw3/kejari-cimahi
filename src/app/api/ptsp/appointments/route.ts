import { NextResponse } from "next/server";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { bidang, ptspAppointments } from "@/lib/schema";
import { getJakartaDayRange } from "@/lib/ptsp";
import { requirePtspAccess } from "@/lib/ptsp-auth";

export async function GET() {
  const unauthorized = await requirePtspAccess();
  if (unauthorized) return unauthorized;

  const { start, end } = getJakartaDayRange();
  const rows = await db
    .select({
      id: ptspAppointments.id,
      bidangId: ptspAppointments.bidangId,
      bidangNama: bidang.nama,
      hostName: ptspAppointments.hostName,
      visitorName: ptspAppointments.visitorName,
      visitorPhone: ptspAppointments.visitorPhone,
      agenda: ptspAppointments.agenda,
      note: ptspAppointments.note,
      scheduledFor: ptspAppointments.scheduledFor,
      isIncognito: ptspAppointments.isIncognito,
      status: ptspAppointments.status,
      confirmedAt: ptspAppointments.confirmedAt,
    })
    .from(ptspAppointments)
    .innerJoin(bidang, eq(ptspAppointments.bidangId, bidang.id))
    .where(
      and(
        gte(ptspAppointments.scheduledFor, start),
        lt(ptspAppointments.scheduledFor, end)
      )
    )
    .orderBy(asc(ptspAppointments.scheduledFor));

  return NextResponse.json({ data: rows });
}
