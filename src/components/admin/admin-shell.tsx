"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Star,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { SseListener } from "./sse-listener";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/laporan", label: "Semua Laporan", icon: FileText },
  { href: "/admin/ai-assistant", label: "Bank Data AI", icon: Star },
  { href: "/admin/skm", label: "Survey (SKM)", icon: Star },
];

interface AdminShellProps {
  children: React.ReactNode;
  session: { user: { name: string; email: string } };
}

export function AdminShell({ children, session }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#071f0d" }}>
      <SseListener />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-auto`}
        style={{ backgroundColor: "#0a3d1a", borderRight: "1px solid rgba(240,180,41,0.12)" }}
      >
        {/* Gold top strip */}
        <div className="h-1 flex-shrink-0" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />

        {/* Logo area */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(240,180,41,0.12)" }}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 p-0.5"
            style={{ backgroundColor: "rgba(240,180,41,0.12)", border: "1px solid rgba(240,180,41,0.3)" }}
          >
            <Image
              src="/logo-kejari.svg"
              alt="Logo SAHATE Kejari Cimahi"
              width={36}
              height={36}
              className="object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm leading-none truncate" style={{ color: "#f0b429" }}>SAHATE Kejari</div>
            <div className="text-[10px] leading-none mt-1 truncate" style={{ color: "#a8d5b5" }}>
              Panel Admin Cimahi
            </div>
          </div>
          <button
            className="ml-auto lg:hidden"
            style={{ color: "#a8d5b5" }}
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="px-3 pb-2 pt-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(168,213,181,0.35)" }}>
              Menu
            </span>
          </div>
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" &&
               pathname.startsWith(item.href) &&
               true);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={
                  active
                    ? { backgroundColor: "rgba(240,180,41,0.12)", color: "#f5c518" }
                    : { color: "rgba(168,213,181,0.6)" }
                }
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = "#c8e6d0";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.color = "rgba(168,213,181,0.6)";
                }}
              >
                <div
                  className="w-0.5 h-5 rounded-full flex-shrink-0 -ml-1"
                  style={{ backgroundColor: active ? "#f0b429" : "transparent" }}
                />
                <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? "#f0b429" : undefined }} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3" style={{ color: "#f0b429", opacity: 0.7 }} />}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="border-t p-4" style={{ borderColor: "rgba(240,180,41,0.12)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
            >
              {session.user.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: "#f5c518" }}>{session.user.name}</div>
              <div className="text-xs truncate" style={{ color: "rgba(168,213,181,0.45)" }}>
                {session.user.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors"
            style={{ color: "rgba(168,213,181,0.5)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(239,68,68,0.12)";
              (e.currentTarget as HTMLButtonElement).style.color = "#fca5a5";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(168,213,181,0.5)";
            }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar dari Sistem
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header
          className="h-14 lg:hidden flex items-center justify-between px-4 border-b sticky top-0 z-30 shadow-sm"
          style={{ backgroundColor: "#0a3d1a", borderColor: "rgba(240,180,41,0.12)" }}
        >
          <button onClick={() => setSidebarOpen(true)} style={{ color: "#a8d5b5" }}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center p-0.5"
              style={{ backgroundColor: "rgba(240,180,41,0.15)", border: "1px solid rgba(240,180,41,0.3)" }}
            >
              <Image
                src="/logo-kejari.svg"
                alt="Logo"
                width={20}
                height={20}
                className="object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <span className="font-semibold text-sm" style={{ color: "#f0b429" }}>SAHATE Kejari</span>
          </div>
          <div className="w-5" />
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
