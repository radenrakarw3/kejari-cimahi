import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bidang, user } from "@/lib/schema";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  bidangId: number | null;
  bidangNama: string | null;
  bidangKode: string | null;
};

export async function getAuthenticatedUser(headers: Headers): Promise<AuthenticatedUser | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;

  const [currentUser] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      bidangId: user.bidangId,
      bidangNama: bidang.nama,
      bidangKode: bidang.kode,
    })
    .from(user)
    .leftJoin(bidang, eq(user.bidangId, bidang.id))
    .where(eq(user.id, session.user.id));

  return currentUser ?? null;
}
