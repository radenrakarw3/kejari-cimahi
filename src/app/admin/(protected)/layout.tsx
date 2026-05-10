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

  /** Hanya role `admin` yang boleh ke panel admin — jangan pakai `bidangId` saja (bisa salah isi di DB). */
  if (currentUser.role !== "admin") {
    if (currentUser.role === "bidang") {
      redirect(currentUser.bidangId ? "/seksi" : "/seksi/login");
    }
    redirect("/admin/login");
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
