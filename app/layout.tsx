import type { Metadata } from "next";
import "./globals.css";
import { inter, lora, plexMono } from "./fonts";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://infomarhaen.id"),
  title: {
    default: "info Marhaen — Portal Berita & Suara Marhaenisme",
    template: "%s | info Marhaen",
  },
  description:
    "Portal berita digital milik GMNI. Sikap editorial: oposisi kritis terhadap kebijakan pemerintah. Ditulis oleh kader terverifikasi, dikurasi oleh redaksi.",
  keywords: [
    "GMNI",
    "Marhaenisme",
    "portal berita",
    "kader GMNI",
    "oposisi",
    "Trisila",
    "Marhaen",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "info Marhaen",
    url: "https://infomarhaen.id",
    images: [{ url: "/og-default", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${lora.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-kertas-150 font-sans text-hitam-900">
        <a
          href="#konten"
          className="sr-only z-50 bg-gmnimerah-500 px-4 py-2 font-mono text-sm font-semibold uppercase tracking-widest text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Lewati ke konten
        </a>
        <AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider>
      </body>
    </html>
  );
}
