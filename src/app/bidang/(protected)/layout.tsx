import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BidangShell } from "@/components/bidang/bidang-shell";
import { getAuthenticatedUser } from "@/lib/authz";

export default async function BidangLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getAuthenticatedUser(await headers());

  if (!currentUser) {
    redirect("/bidang/login");
  }

  if (!currentUser.bidangId) {
    redirect("/admin/dashboard");
  }

  return (
    <BidangShell
      user={{
        name: currentUser.name,
        email: currentUser.email,
        bidangNama: currentUser.bidangNama,
        bidangKode: currentUser.bidangKode,
      }}
    >
      {children}
    </BidangShell>
  );
}
