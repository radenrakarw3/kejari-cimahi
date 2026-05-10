import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { type AuthenticatedUser, getAuthenticatedUser } from "@/lib/authz";
import { normalizePhone } from "@/lib/whatsapp";

type SeksiUser = AuthenticatedUser & { role: "bidang"; bidangId: number };

function requireSeksiUser(
  currentUser: AuthenticatedUser | null
): NextResponse | SeksiUser {
  if (!currentUser || currentUser.role !== "bidang" || currentUser.bidangId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return currentUser as SeksiUser;
}

export async function GET() {
  const raw = await getAuthenticatedUser(await headers());
  const currentUser = requireSeksiUser(raw);
  if (currentUser instanceof NextResponse) return currentUser;

  return NextResponse.json({
    profile: {
      name: currentUser.name,
      email: currentUser.email,
      phoneNumber: currentUser.phoneNumber,
      bidangNama: currentUser.bidangNama,
      bidangKode: currentUser.bidangKode,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const raw = await getAuthenticatedUser(await headers());
  const currentUser = requireSeksiUser(raw);
  if (currentUser instanceof NextResponse) return currentUser;

  const body = (await req.json()) as {
    name?: string;
    phoneNumber?: string | null;
  };

  const name = body.name?.trim();
  const rawPhone = body.phoneNumber?.trim() ?? "";
  const phoneNumber = rawPhone ? normalizePhone(rawPhone) : null;

  if (!name || name.length < 3) {
    return NextResponse.json({ error: "Nama petugas minimal 3 karakter" }, { status: 400 });
  }

  if (phoneNumber && !/^628\d{8,12}$/.test(phoneNumber)) {
    return NextResponse.json(
      { error: "Nomor WA harus diawali 08 atau 628 dan panjangnya valid" },
      { status: 400 }
    );
  }

  await db
    .update(user)
    .set({
      name,
      phoneNumber,
      updatedAt: new Date(),
    })
    .where(eq(user.id, currentUser.id));

  return NextResponse.json({
    success: true,
    profile: {
      name,
      email: currentUser.email,
      phoneNumber,
      bidangNama: currentUser.bidangNama,
      bidangKode: currentUser.bidangKode,
    },
  });
}
