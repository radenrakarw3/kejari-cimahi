import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Layanan & Laporan - Kejari Cimahi",
  description:
    "Portal pelayanan publik dan laporan masyarakat Kejaksaan Negeri Cimahi. Sampaikan laporan, akses layanan, dan pantau status pengaduan Anda.",
  keywords: ["kejari cimahi", "laporan masyarakat", "pelayanan publik", "kejaksaan negeri cimahi", "pengaduan"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-white">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
