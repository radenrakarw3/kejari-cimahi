import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/authz";
import { SeksiProfileClient } from "@/components/seksi/seksi-profile-client";

export const dynamic = "force-dynamic";

export default async function SeksiProfilPage() {
  const currentUser = await getAuthenticatedUser(await headers());

  if (!currentUser) {
    redirect("/seksi/login");
  }

  if (!currentUser.bidangId) {
    redirect("/admin/dashboard");
  }

  return (
    <SeksiProfileClient
      initialProfile={{
        name: currentUser.name,
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber,
        bidangNama: currentUser.bidangNama,
        bidangKode: currentUser.bidangKode,
      }}
    />
  );
}
