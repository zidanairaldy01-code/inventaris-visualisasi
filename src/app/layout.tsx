import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SIMAS - SMK PGRI Telagasari",
    template: "%s | SIMAS - SMK PGRI Telagasari",
  },
  description: "Sistem Informasi Manajemen Aset Digital SMK PGRI Telagasari",
  icons: {
    icon: [
      { url: "/smk-pgri-telagasari.png" },
      { url: "/icon.png" },
    ],
    shortcut: "/smk-pgri-telagasari.png",
    apple: "/smk-pgri-telagasari.png",
  },
  themeColor: "#1e293b",
};

import AuthTimeoutWatcher from "@/components/AuthTimeoutWatcher";
import NumberInputDotBlocker from "@/components/NumberInputDotBlocker";
import GlobalErrorModal from "@/components/GlobalErrorModal";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/smk-pgri-telagasari.png" sizes="any" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-full flex flex-col touch-manipulation">
        <AuthTimeoutWatcher />
        <NumberInputDotBlocker />
        <GlobalErrorModal />
        {children}
      </body>
    </html>
  );
}
