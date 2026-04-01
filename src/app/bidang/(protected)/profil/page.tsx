import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/authz";
import { BidangProfileClient } from "./profile-client";

export const dynamic = "force-dynamic";

export default async function BidangProfilPage() {
  const currentUser = await getAuthenticatedUser(await headers());

  if (!currentUser) {
    redirect("/bidang/login");
  }

  if (!currentUser.bidangId) {
    redirect("/admin/dashboard");
  }

  return (
    <BidangProfileClient
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
