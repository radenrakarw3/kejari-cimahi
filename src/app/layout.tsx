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
  title: "SAHATE Kejari Cimahi",
  description:
    "SAHATE Kejari Cimahi adalah Sistem Akses Hukum Terpadu dan Elektronik untuk layanan hukum, pengaduan masyarakat, informasi hukum, dan helpdesk terintegrasi WhatsApp.",
  keywords: [
    "sahate kejari cimahi",
    "sistem akses hukum terpadu dan elektronik",
    "kejari cimahi",
    "laporan masyarakat",
    "pelayanan hukum digital",
    "pengaduan masyarakat",
  ],
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
