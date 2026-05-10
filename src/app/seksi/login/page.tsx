"use client";

import { useState } from "react";
import { Building2, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SeksiLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      toast.error("Masukkan email");
      return;
    }
    setLoading(true);
    try {
      await signIn.email({ email: normalized, password });
      // Navigasi penuh: request /api/auth/me segera setelah sign-in sering jalan
      // sebelum cookie sesi terpasang → bidangId hilang dan salah dianggap admin.
      window.location.assign("/seksi");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login gagal";
      toast.error(msg.includes("credential") || msg.includes("INVALID") ? "Email atau password tidak sesuai" : msg);
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
                Login Seksi
              </h1>
              <p className="text-xs mt-1" style={{ color: "#a8d5b5" }}>
                Masuk dengan email akun seksi Anda (contoh: seksi.pidum@kejari-cimahi.go.id).
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label style={{ color: "#f0b429" }}>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8d5b5" }} />
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seksi.pidum@kejari-cimahi.go.id"
                  required
                  className="pl-9 h-11 rounded-xl"
                  style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label style={{ color: "#f0b429" }}>Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8d5b5" }} />
                <Input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
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
              {loading ? "Memverifikasi..." : "Masuk ke Portal Seksi"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
