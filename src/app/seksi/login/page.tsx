"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Building2, ChevronDown, Eye, EyeOff, HelpCircle, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEKSI_DEFINITIONS, seksiEmailForKode } from "@/lib/seksi-accounts";

const sandiBantuanDefault =
  "Sandi akun seksi diatur saat aktivasi oleh pengelola sistem (minimal 8 karakter). " +
  "Jika lupa sandi, minta pengaturan ulang ke administrasi SAHATE / pejabat struktural terkait di Kejari Cimahi — tidak ada reset mandiri dari halaman ini.";

export default function SeksiLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const sandiBantuanExtra = process.env.NEXT_PUBLIC_SEKSI_BANTUAN?.trim();

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
      window.location.assign("/seksi");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login gagal";
      const plain =
        msg.includes("credential") ||
        msg.includes("INVALID") ||
        msg.toLowerCase().includes("password")
          ? "Email atau sandi tidak cocok. Periksa alamat email resmi seksi dan sandi dari pengelola."
          : msg;
      toast.error(plain);
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

      <div className="relative w-full max-w-md max-h-[min(100vh-2rem,900px)] overflow-y-auto rounded-[28px] shadow-2xl" style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.18)" }}>
        <div className="h-1.5 shrink-0" style={{ background: "linear-gradient(90deg, #f0b429, #f5c518, #f0b429)" }} />

        <div className="px-7 pt-8 pb-6">
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 p-1"
              style={{ backgroundColor: "rgba(240,180,41,0.1)", border: "1px solid rgba(240,180,41,0.28)" }}
            >
              <Image
                src="/logo-kejari.svg"
                alt=""
                width={52}
                height={52}
                className="object-contain"
                priority
              />
            </div>
            <div className="text-xs uppercase tracking-[0.28em] font-semibold" style={{ color: "#f0b429" }}>
              SAHATE
            </div>
            <h1 className="text-xl font-bold flex items-center gap-2 mt-1" style={{ color: "#f5c518" }}>
              <Building2 className="w-6 h-6 inline shrink-0" style={{ color: "#f0b429" }} />
              Portal Seksi
            </h1>
            <p className="text-xs mt-2 text-center leading-relaxed px-1" style={{ color: "#a8d5b5" }}>
              Masuk dengan <strong className="font-semibold" style={{ color: "#c8e6d0" }}>email resmi seksi</strong> dan sandi yang diberikan pengelola.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
              <Label style={{ color: "#f0b429" }}>Sandi</Label>
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
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#a8d5b5" }}
                  aria-label={showPass ? "Sembunyikan sandi" : "Tampilkan sandi"}
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
              {loading ? "Memverifikasi..." : "Masuk"}
            </Button>
          </form>

          <div className="mt-6 rounded-xl p-3 text-[11px] leading-relaxed" style={{ backgroundColor: "rgba(7,31,13,0.35)", border: "1px solid rgba(240,180,41,0.15)" }}>
            <div className="flex gap-2 font-semibold mb-1.5" style={{ color: "#f0b429" }}>
              <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Lupa sandi atau belum punya akses?
            </div>
            <p style={{ color: "rgba(200,230,208,0.9)" }}>{sandiBantuanDefault}</p>
            {sandiBantuanExtra && (
              <p className="mt-2 whitespace-pre-wrap" style={{ color: "#c8e6d0" }}>
                {sandiBantuanExtra}
              </p>
            )}
          </div>

          <details className="mt-4 group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-2 text-xs font-medium py-2 px-1 rounded-lg -mx-1 hover:bg-white/5" style={{ color: "#f5c518" }}>
              <span>Daftar email resmi per seksi</span>
              <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="mt-2 space-y-2 text-[11px] pl-1 border-l-2 ml-1" style={{ borderColor: "rgba(240,180,41,0.35)", color: "#a8d5b5" }}>
              {SEKSI_DEFINITIONS.map((s) => (
                <li key={s.kode}>
                  <span className="font-mono font-semibold" style={{ color: "#f0b429" }}>
                    {s.kode}
                  </span>
                  {" — "}
                  {s.nama}
                  <br />
                  <span className="break-all opacity-90">{seksiEmailForKode(s.kode)}</span>
                </li>
              ))}
            </ul>
          </details>

          <p className="mt-6 text-center text-xs" style={{ color: "rgba(168,213,181,0.75)" }}>
            Bukan akun seksi?{" "}
            <Link href="/admin/login" className="font-semibold underline underline-offset-2 hover:opacity-90" style={{ color: "#f0b429" }}>
              Masuk panel admin
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
