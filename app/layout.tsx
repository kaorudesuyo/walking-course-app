import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Walking Course — Kaoru Furubayashi",
  description: "現在地からあなただけのウォーキングコースを無料提案。",
  manifest: "/manifest.json",
  themeColor: "#0a0a0a",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Walk" },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
