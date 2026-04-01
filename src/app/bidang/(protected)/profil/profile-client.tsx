"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Phone, Save, ShieldUser, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BidangProfileClientProps {
  initialProfile: {
    name: string;
    email: string;
    phoneNumber: string | null;
    bidangNama: string | null;
    bidangKode: string | null;
  };
}

export function BidangProfileClient({ initialProfile }: BidangProfileClientProps) {
  const router = useRouter();
  const [name, setName] = useState(initialProfile.name);
  const [phoneNumber, setPhoneNumber] = useState(initialProfile.phoneNumber ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/bidang/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phoneNumber }),
      });

      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Gagal menyimpan profil");
      }

      toast.success("Profil bidang berhasil diperbarui");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.28em] font-semibold" style={{ color: "#f0b429" }}>
          Profil Bidang
        </div>
        <h1 className="text-2xl font-bold mt-1" style={{ color: "#f5c518" }}>
          Data Petugas dan Notifikasi
        </h1>
        <p className="text-sm mt-2 max-w-2xl" style={{ color: "#a8d5b5" }}>
          Atur nama petugas yang tampil di portal bidang serta nomor WhatsApp admin bidang untuk menerima notifikasi saat admin mengirim disposisi baru.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="rounded-3xl p-5"
          style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(240,180,41,0.10)" }}>
              <Building2 className="w-5 h-5" style={{ color: "#f0b429" }} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "#f5c518" }}>{initialProfile.bidangNama}</div>
              <div className="text-xs" style={{ color: "#a8d5b5" }}>{initialProfile.bidangKode}</div>
            </div>
          </div>
        </div>

        <div
          className="rounded-3xl p-5"
          style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "rgba(240,180,41,0.10)" }}>
              <ShieldUser className="w-5 h-5" style={{ color: "#f0b429" }} />
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ color: "#f5c518" }}>{initialProfile.email}</div>
              <div className="text-xs" style={{ color: "#a8d5b5" }}>Akun login bidang</div>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-[28px] p-6 space-y-5"
        style={{ backgroundColor: "#0d4d22", border: "1px solid rgba(240,180,41,0.15)" }}
      >
        <div className="space-y-1.5">
          <Label style={{ color: "#f0b429" }}>
            <UserRound className="w-4 h-4" />
            Nama Petugas
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masukkan nama petugas bidang"
            className="h-11 rounded-xl"
            style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
          />
          <p className="text-[11px]" style={{ color: "rgba(168,213,181,0.65)" }}>
            Nama ini dipakai sebagai identitas petugas bidang pada portal internal.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label style={{ color: "#f0b429" }}>
            <Phone className="w-4 h-4" />
            Nomor WA Admin Bidang
          </Label>
          <Input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Contoh: 081234567890"
            className="h-11 rounded-xl"
            style={{ backgroundColor: "#145228", borderColor: "rgba(240,180,41,0.25)", color: "#c8e6d0" }}
          />
          <p className="text-[11px]" style={{ color: "rgba(168,213,181,0.65)" }}>
            Nomor ini akan menerima notifikasi WhatsApp setiap ada disposisi baru dari admin.
          </p>
        </div>

        <div
          className="rounded-2xl px-4 py-3 text-sm"
          style={{ backgroundColor: "rgba(240,180,41,0.07)", border: "1px solid rgba(240,180,41,0.12)", color: "#c8e6d0" }}
        >
          Jika nomor WA dikosongkan, notifikasi disposisi ke admin bidang tidak akan dikirim.
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="rounded-xl"
            style={{ backgroundColor: "#f0b429", color: "#071f0d" }}
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? "Menyimpan..." : "Simpan Profil"}
          </Button>
        </div>
      </form>
    </div>
  );
}
