import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SeksiShell } from "@/components/seksi/seksi-shell";
import { getAuthenticatedUser } from "@/lib/authz";

export default async function SeksiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getAuthenticatedUser(await headers());

  if (!currentUser) {
    redirect("/seksi/login");
  }

  /** Akun admin tetap ke panel admin, bukan area petugas seksi. */
  if (currentUser.role === "admin") {
    redirect("/admin/dashboard");
  }

  if (currentUser.role !== "bidang" || !currentUser.bidangId) {
    redirect("/seksi/login");
  }

  return (
    <SeksiShell
      user={{
        name: currentUser.name,
        email: currentUser.email,
        bidangNama: currentUser.bidangNama,
        bidangKode: currentUser.bidangKode,
      }}
    >
      {children}
    </SeksiShell>
  );
}
