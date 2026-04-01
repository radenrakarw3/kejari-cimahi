"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BidangLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resolveRes = await fetch("/api/bidang/login-resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });

      const resolveData = (await resolveRes.json().catch(() => null)) as {
        email?: string;
        error?: string;
      } | null;

      if (!resolveRes.ok || !resolveData?.email) {
        throw new Error(resolveData?.error ?? "Kode bidang tidak ditemukan");
      }

      await signIn.email({ email: resolveData.email, password });
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = (await meRes.json().catch(() => null)) as {
        user?: { bidangId?: number | null };
      } | null;

      router.push(meData?.user?.bidangId ? "/bidang" : "/admin/dashboard");
    } catch {
      toast.error("Email atau password tidak valid");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: "radial-gradient(circle at top, rgba(240,180,41,0.12), transparent 30%), #071f0d" }}
    >
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(135deg, rgba(240,180,41,0.6) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      <div
        className="relative w-full max-w-md rounded-[28px] overflow-hidden shadow-2xl"
        style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" }}
      >
        <div className="h-1.5" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />

        <div className="px-7 pt-8 pb-7">
          <div className="flex items-center gap-4 mb-7">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(240,180,41,0.12)", border: "1px solid rgba(240,180,41,0.28)" }}
            >
              <Building2 className="w-7 h-7" style={{ color: "#f0b429" }} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.28em] font-semibold" style={{ color: "#f0b429" }}>
                SAHATE
              </div>
              <h1 className="text-xl font-bold" style={{ color: "#f5c518" }}>
                Login Bidang
              </h1>
              <p className="text-xs mt-1" style={{ color: "#a8d5b5" }}>
                Akses khusus tindak lanjut disposisi laporan warga
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label style={{ color: "#f0b429" }}>Kode Bidang</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8d5b5" }} />
                <Input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                  placeholder="Contoh: PBIN"
                  required
                  className="pl-9 h-11 rounded-xl"
                  style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
                />
              </div>
              <p className="text-[11px]" style={{ color: "rgba(168,213,181,0.65)" }}>
                Cukup masukkan kode bidang seperti `PBIN`, `INTEL`, `PIDUM`, `PIDSUS`, atau `DATUN`.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label style={{ color: "#f0b429" }}>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8d5b5" }} />
                <Input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-9 pr-10 h-11 rounded-xl"
                  style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#a8d5b5" }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-semibold"
              style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
            >
              {loading ? "Memverifikasi..." : "Masuk ke Portal Bidang"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
