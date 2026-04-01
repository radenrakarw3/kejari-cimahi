"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, ClipboardCheck, LogOut, Menu, Settings2, X } from "lucide-react";
import { signOut } from "@/lib/auth-client";

interface BidangShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    email: string;
    bidangNama: string | null;
    bidangKode: string | null;
  };
}

const NAV_ITEMS = [{ href: "/bidang", label: "Disposisi Masuk", icon: ClipboardCheck }];
const EXTRA_NAV_ITEMS = [{ href: "/bidang/profil", label: "Profil Bidang", icon: Settings2 }];

export function BidangShell({ children, user }: BidangShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push("/bidang/login");
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#071f0d" }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-auto`}
        style={{ backgroundColor: "#0a3d1a", borderRight: "1px solid rgba(240,180,41,0.12)" }}
      >
        <div className="h-1 flex-shrink-0" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />

        <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(240,180,41,0.12)" }}>
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "rgba(240,180,41,0.12)", border: "1px solid rgba(240,180,41,0.28)" }}
            >
              <Building2 className="w-5 h-5" style={{ color: "#f0b429" }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold tracking-[0.24em] uppercase" style={{ color: "#f0b429" }}>
                Portal Bidang
              </div>
              <div className="text-base font-bold mt-1 leading-tight" style={{ color: "#f5c518" }}>
                {user.bidangNama ?? "Bidang"}
              </div>
              <div className="text-xs mt-1" style={{ color: "rgba(168,213,181,0.7)" }}>
                {user.bidangKode ?? "Akses petugas"}
              </div>
            </div>
            <button
              className="lg:hidden"
              style={{ color: "#a8d5b5" }}
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {[...NAV_ITEMS, ...EXTRA_NAV_ITEMS].map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={
                  active
                    ? { backgroundColor: "rgba(240,180,41,0.12)", color: "#f5c518" }
                    : { color: "rgba(168,213,181,0.7)" }
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4 space-y-3" style={{ borderColor: "rgba(240,180,41,0.12)" }}>
          <div>
            <div className="text-sm font-semibold truncate" style={{ color: "#f5c518" }}>
              {user.name}
            </div>
            <div className="text-xs truncate" style={{ color: "rgba(168,213,181,0.55)" }}>
              {user.email}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs transition-colors"
            style={{ color: "rgba(168,213,181,0.6)", backgroundColor: "rgba(240,180,41,0.06)" }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-14 lg:hidden flex items-center justify-between px-4 border-b sticky top-0 z-30"
          style={{ backgroundColor: "#0a3d1a", borderColor: "rgba(240,180,41,0.12)" }}
        >
          <button onClick={() => setSidebarOpen(true)} style={{ color: "#a8d5b5" }}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold" style={{ color: "#f0b429" }}>
            {user.bidangKode ?? "Bidang"}
          </div>
          <div className="w-5" />
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
