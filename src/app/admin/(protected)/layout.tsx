import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAuthenticatedUser } from "@/lib/authz";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getAuthenticatedUser(await headers());
  if (!currentUser) {
    redirect("/admin/login");
  }

  if (currentUser.bidangId) {
    redirect("/bidang");
  }

  return (
    <AdminShell
      session={{
        user: {
          name: currentUser.name,
          email: currentUser.email,
        },
      }}
    >
      {children}
    </AdminShell>
  );
}
