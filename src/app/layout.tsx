import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const metadataBaseRaw =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ??
  process.env.BETTER_AUTH_URL?.trim() ??
  "http://localhost:3000";

const metadataBaseUrl = metadataBaseRaw.replace(/\/+$/, "");

const defaultDescription =
  "SAHATE Kejari Cimahi adalah layanan pengaduan masyarakat dari Kejaksaan Negeri Cimahi untuk memudahkan warga menyampaikan laporan dan memantau tindak lanjutnya.";

export const metadata: Metadata = {
  metadataBase: new URL(`${metadataBaseUrl}/`),
  title: {
    default: "SAHATE Kejari Cimahi",
    template: "%s · SAHATE Kejari Cimahi",
  },
  description: defaultDescription,
  keywords: [
    "sahate kejari cimahi",
    "sistem akses hukum terpadu dan elektronik",
    "kejari cimahi",
    "laporan masyarakat",
    "pelayanan hukum digital",
    "pengaduan masyarakat",
  ],
  icons: {
    icon: [{ url: "/logo-kejari.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo-kejari.svg", sizes: "180x180", type: "image/svg+xml" }],
    shortcut: "/logo-kejari.svg",
  },
  openGraph: {
    title: "SAHATE Kejari Cimahi",
    description: defaultDescription,
    type: "website",
    locale: "id_ID",
    siteName: "SAHATE Kejari Cimahi",
    images: [
      {
        url: "/logo-kejari.svg",
        width: 512,
        height: 512,
        alt: "Logo Kejaksaan Negeri Cimahi · SAHATE",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "SAHATE Kejari Cimahi",
    description: defaultDescription,
    images: [{ url: "/logo-kejari.svg", alt: "Logo SAHATE Kejari Cimahi" }],
  },
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
