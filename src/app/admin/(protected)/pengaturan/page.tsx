"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  KeyRound,
  Lock,
  Shield,
  MonitorSmartphone,
  Users,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SeksiRow = {
  id: string;
  email: string;
  name: string;
  bidangKode: string | null;
  bidangNama: string | null;
};

export default function PengaturanPage() {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [gatePin, setGatePin] = useState("");
  const [loadingGate, setLoadingGate] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const [ptspLoaded, setPtspLoaded] = useState(false);
  const [ptspInDb, setPtspInDb] = useState(false);
  const [newPtspPin, setNewPtspPin] = useState("");
  const [savingPtsp, setSavingPtsp] = useState(false);

  const [seksiUsers, setSeksiUsers] = useState<SeksiRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newSeksiPw, setNewSeksiPw] = useState<Record<string, string>>({});

  const refreshStatus = useCallback(async () => {
    const res = await fetch("/api/admin/settings/status", {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) {
      setUnlocked(false);
      if (res.status === 401) {
        toast.error("Sesi tidak valid. Silakan masuk lagi sebagai admin.");
        router.push("/admin/login");
      }
      return;
    }
    const data = (await res.json()) as { unlocked?: boolean };
    setUnlocked(Boolean(data.unlocked));
  }, [router]);

  const loadPanelData = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const [ptspRes, usersRes] = await Promise.all([
        fetch("/api/admin/settings/ptsp-pin", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/admin/settings/seksi-users", {
          cache: "no-store",
          credentials: "include",
        }),
      ]);
      if (ptspRes.status === 401 || usersRes.status === 401) {
        toast.error("Sesi tidak valid. Silakan masuk lagi sebagai admin.");
        router.push("/admin/login");
        return;
      }
      if (ptspRes.ok) {
        const p = (await ptspRes.json()) as { configuredInDatabase?: boolean };
        setPtspInDb(Boolean(p.configuredInDatabase));
        setPtspLoaded(true);
      }
      if (usersRes.ok) {
        const u = (await usersRes.json()) as { users?: SeksiRow[] };
        setSeksiUsers(u.users ?? []);
      }
    } finally {
      setLoadingUsers(false);
    }
  }, [router]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (unlocked) void loadPanelData();
  }, [unlocked, loadPanelData]);

  const submitGate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingGate(true);
    try {
      const res = await fetch("/api/admin/settings/verify-pin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: gatePin.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Sesi tidak valid. Silakan masuk lagi sebagai admin.");
          router.push("/admin/login");
          return;
        }
        toast.error(typeof data.error === "string" ? data.error : "Kode salah");
        return;
      }
      toast.success("Akses pengaturan dibuka (2 jam)");
      setGatePin("");
      setUnlocked(true);
    } finally {
      setLoadingGate(false);
    }
  };

  const lockAgain = async () => {
    await fetch("/api/admin/settings/lock", {
      method: "POST",
      credentials: "include",
    });
    setUnlocked(false);
    toast.message("Panel pengaturan dikunci lagi");
  };

  const submitAdminPw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast.error("Sandi baru dan konfirmasi tidak sama");
      return;
    }
    if (newPw.length < 8) {
      toast.error("Sandi baru minimal 8 karakter");
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
          revokeOtherSessions: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(typeof err.message === "string" ? err.message : "Gagal ubah sandi");
        return;
      }
      toast.success("Sandi admin diperbarui");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } finally {
      setSavingPw(false);
    }
  };

  const submitPtsp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(newPtspPin.trim())) {
      toast.error("PIN PTSP 4–8 digit angka");
      return;
    }
    setSavingPtsp(true);
    try {
      const res = await fetch("/api/admin/settings/ptsp-pin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: newPtspPin.trim() }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Sesi tidak valid. Silakan masuk lagi sebagai admin.");
          router.push("/admin/login");
          return;
        }
        const err = await res.json().catch(() => ({}));
        toast.error(typeof err.error === "string" ? err.error : "Gagal simpan");
        return;
      }
      toast.success("PIN front desk PTSP diperbarui");
      setNewPtspPin("");
      setPtspInDb(true);
    } finally {
      setSavingPtsp(false);
    }
  };

  const resetSeksiPw = async (userId: string) => {
    const pw = newSeksiPw[userId]?.trim() ?? "";
    if (pw.length < 8) {
      toast.error("Sandi minimal 8 karakter");
      return;
    }
    setResetFor(userId);
    try {
      const res = await fetch("/api/admin/settings/reset-seksi-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword: pw }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Sesi tidak valid. Silakan masuk lagi sebagai admin.");
          router.push("/admin/login");
          return;
        }
        const err = await res.json().catch(() => ({}));
        toast.error(typeof err.error === "string" ? err.error : "Gagal reset");
        return;
      }
      toast.success("Sandi akun seksi diperbarui");
      setNewSeksiPw((prev) => ({ ...prev, [userId]: "" }));
    } finally {
      setResetFor(null);
    }
  };

  if (unlocked === null) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" style={{ color: "#a8d5b5" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f0b429" }} />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div
          className="rounded-2xl p-6 border"
          style={{ backgroundColor: "#0d4d22", borderColor: "rgba(240,180,41,0.2)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(240,180,41,0.12)" }}>
              <Shield className="w-6 h-6" style={{ color: "#f0b429" }} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: "#f5c518" }}>
                Pengaturan sistem
              </h1>
              <p className="text-xs" style={{ color: "#a8d5b5" }}>
                Masukkan kode pengaturan untuk mengelola sandi admin, seksi, dan PIN PTSP.
              </p>
            </div>
          </div>
          <form onSubmit={submitGate} className="space-y-4">
            <div>
              <Label style={{ color: "#f0b429" }}>Kode pengaturan</Label>
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={gatePin}
                onChange={(e) => setGatePin(e.target.value)}
                placeholder="••••••"
                className="mt-1 h-11 rounded-xl"
                style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
              />
              <p className="text-[11px] mt-1" style={{ color: "rgba(168,213,181,0.55)" }}>
                Standar: 664599 · dapat diubah lewat env{" "}
                <code className="text-[10px]">ADMIN_SYSTEM_PIN</code> di server.
              </p>
            </div>
            <Button
              type="submit"
              disabled={loadingGate}
              className="w-full rounded-xl font-semibold h-11"
              style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
            >
              {loadingGate ? "Memeriksa..." : "Buka pengaturan"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#f5c518" }}>
            Pengaturan akun &amp; akses
          </h1>
          <p className="text-sm mt-1" style={{ color: "#a8d5b5" }}>
            Sandi admin, reset sandi seksi, dan PIN front desk PTSP.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void lockAgain()}
          className="rounded-xl border shrink-0"
          style={{ borderColor: "rgba(240,180,41,0.4)", color: "#f0b429" }}
        >
          <Lock className="w-4 h-4 mr-2" />
          Kunci panel
        </Button>
      </div>

      {/* Admin password */}
      <section
        className="rounded-2xl p-6 border"
        style={{ backgroundColor: "#0d4d22", borderColor: "rgba(240,180,41,0.18)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5" style={{ color: "#f0b429" }} />
          <h2 className="font-semibold text-lg" style={{ color: "#f5c518" }}>
            Sandi akun admin (Anda)
          </h2>
        </div>
        <form onSubmit={submitAdminPw} className="space-y-3 max-w-md">
          <div>
            <Label style={{ color: "#f0b429" }}>Sandi saat ini</Label>
            <Input
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="mt-1 h-10 rounded-lg"
              style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
              required
            />
          </div>
          <div>
            <Label style={{ color: "#f0b429" }}>Sandi baru</Label>
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="mt-1 h-10 rounded-lg"
              style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
              required
            />
          </div>
          <div>
            <Label style={{ color: "#f0b429" }}>Ulangi sandi baru</Label>
            <Input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="mt-1 h-10 rounded-lg"
              style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={savingPw}
            className="rounded-lg"
            style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
          >
            {savingPw ? "Menyimpan..." : "Ubah sandi admin"}
          </Button>
        </form>
      </section>

      {/* PTSP PIN */}
      <section
        className="rounded-2xl p-6 border"
        style={{ backgroundColor: "#0d4d22", borderColor: "rgba(240,180,41,0.18)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <MonitorSmartphone className="w-5 h-5" style={{ color: "#f0b429" }} />
          <h2 className="font-semibold text-lg" style={{ color: "#f5c518" }}>
            PIN front desk PTSP
          </h2>
        </div>
        {ptspLoaded && (
          <p className="text-xs mb-4" style={{ color: "#a8d5b5" }}>
            Status:{" "}
            {ptspInDb
              ? "Tersimpan di database (menggantikan env jika ada)."
              : "Belum di database — masih memakai env PTSP_FRONTDESK_PIN atau default 1960."}
          </p>
        )}
        <form onSubmit={submitPtsp} className="flex flex-col sm:flex-row gap-3 sm:items-end max-w-lg">
          <div className="flex-1">
            <Label style={{ color: "#f0b429" }}>PIN baru (4–8 digit)</Label>
            <Input
              inputMode="numeric"
              value={newPtspPin}
              onChange={(e) => setNewPtspPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="contoh 664599"
              className="mt-1 h-10 rounded-lg font-mono"
              style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
            />
          </div>
          <Button
            type="submit"
            disabled={savingPtsp}
            className="rounded-lg sm:mb-0.5"
            style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
          >
            {savingPtsp ? "Menyimpan..." : "Simpan PIN"}
          </Button>
        </form>
      </section>

      {/* Seksi */}
      <section
        className="rounded-2xl p-6 border"
        style={{ backgroundColor: "#0d4d22", borderColor: "rgba(240,180,41,0.18)" }}
      >
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: "#f0b429" }} />
            <h2 className="font-semibold text-lg" style={{ color: "#f5c518" }}>
              Akun seksi
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void loadPanelData()}
            disabled={loadingUsers}
            className="text-xs"
            style={{ color: "#a8d5b5" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingUsers ? "animate-spin" : ""}`} />
            Muat ulang
          </Button>
        </div>
        {loadingUsers && seksiUsers.length === 0 ? (
          <p className="text-sm" style={{ color: "#a8d5b5" }}>
            Memuat…
          </p>
        ) : (
          <div className="space-y-4">
            {seksiUsers.map((u) => (
              <div
                key={u.id}
                className="rounded-xl p-4 border"
                style={{ borderColor: "rgba(240,180,41,0.12)", backgroundColor: "rgba(7,31,13,0.35)" }}
              >
                <div className="text-sm font-medium mb-1" style={{ color: "#f5c518" }}>
                  {u.bidangKode} — {u.bidangNama}
                </div>
                <div className="text-xs mb-3 font-mono break-all" style={{ color: "#a8d5b5" }}>
                  {u.email}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  <div className="flex-1">
                    <Label className="text-[11px]" style={{ color: "#f0b429" }}>
                      Sandi baru
                    </Label>
                    <Input
                      type="password"
                      value={newSeksiPw[u.id] ?? ""}
                      onChange={(e) =>
                        setNewSeksiPw((prev) => ({ ...prev, [u.id]: e.target.value }))
                      }
                      placeholder="min. 8 karakter"
                      className="mt-0.5 h-9 rounded-lg text-sm"
                      style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={resetFor === u.id}
                    onClick={() => void resetSeksiPw(u.id)}
                    className="rounded-lg"
                    style={{ backgroundColor: "rgba(240,180,41,0.9)", color: "#071f0d" }}
                  >
                    {resetFor === u.id ? "..." : "Reset sandi"}
                  </Button>
                </div>
              </div>
            ))}
            {seksiUsers.length === 0 && !loadingUsers && (
              <p className="text-sm" style={{ color: "rgba(168,213,181,0.6)" }}>
                Belum ada user dengan role seksi. Jalankan seed &amp; bootstrap akun.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
