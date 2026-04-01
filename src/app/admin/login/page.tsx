"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn.email({ email, password });
      router.push("/admin/dashboard");
    } catch {
      toast.error("Email atau password salah");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ backgroundColor: "#071f0d" }}
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, #f0b429 0px, #f0b429 1px, transparent 1px, transparent 20px)`,
        }}
      />
      {/* Glow circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-[0.06]" style={{ backgroundColor: "#f0b429", filter: "blur(60px)" }} />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-[0.06]" style={{ backgroundColor: "#f0b429", filter: "blur(60px)" }} />

      {/* Top gold strip */}
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div
          className="overflow-hidden rounded-2xl shadow-2xl"
          style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.2)" }}
        >
          {/* Card header */}
          <div className="flex flex-col items-center py-8 px-6 text-center" style={{ backgroundColor: "#0a3d1a" }}>
            <div
              className="w-20 h-20 flex items-center justify-center mb-4 rounded-full p-1.5 shadow-lg"
              style={{ backgroundColor: "rgba(240,180,41,0.12)", border: "2px solid rgba(240,180,41,0.3)" }}
            >
              <Image
                src="/logo-kejari.svg"
                alt="Logo Kejari"
                width={64}
                height={64}
                className="object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <div className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#f0b429" }}>
              Kejaksaan Negeri
            </div>
            <h1 className="text-xl font-bold tracking-wide leading-tight" style={{ color: "#f5c518" }}>KOTA CIMAHI</h1>
            <div className="mt-2 text-[11px] tracking-[0.2em] uppercase font-medium" style={{ color: "#a8d5b5" }}>
              Satya Adhi Wicaksana
            </div>
          </div>

          {/* Divider stripe */}
          <div className="h-1" style={{ background: "linear-gradient(90deg, #f0b429, #d4920a, #f0b429)" }} />

          {/* Form */}
          <div className="px-7 py-8">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold" style={{ color: "#f5c518" }}>Masuk Panel Admin</h2>
              <p className="text-xs mt-1" style={{ color: "#a8d5b5" }}>Sistem Laporan Masyarakat Digital</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium" style={{ color: "#f0b429" }}>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8d5b5" }} />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@kejari-cimahi.go.id"
                    required
                    className="pl-9 h-11 rounded-lg text-sm placeholder:opacity-40"
                    style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium" style={{ color: "#f0b429" }}>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#a8d5b5" }} />
                  <Input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="pl-9 pr-10 h-11 rounded-lg text-sm placeholder:opacity-40"
                    style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
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
                className="w-full h-11 rounded-lg font-bold text-sm tracking-wide mt-1"
                style={{ backgroundColor: loading ? "#c9961e" : "#f0b429", color: "#071f0d" }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#071f0d]/30 border-t-[#071f0d] rounded-full animate-spin" />
                    Memverifikasi...
                  </span>
                ) : (
                  "MASUK"
                )}
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(168,213,181,0.4)" }}>
          © 2025 Kejaksaan Negeri Cimahi · Hak Akses Terbatas
        </p>
      </div>
    </main>
  );
}
