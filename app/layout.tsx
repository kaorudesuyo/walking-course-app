import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Walking Course — Kaoru Furubayashi",
  description: "現在地からあなただけのウォーキングコースを無料提案。",
  manifest: "/manifest.json",
  themeColor: "#0a0a0a",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Walking" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
