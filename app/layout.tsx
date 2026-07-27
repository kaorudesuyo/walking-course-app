import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  // 周游 SYUYU — ぐるっと巡って還るウォーキングコース提案
  title: "周游 SYUYU — ウォーキングコース提案",
  description: "現在地から、同じ道を戻らずぐるりと巡って還る。あなただけのウォーキングコースを無料提案する「周游 SYUYU」。",
  manifest: "/manifest.json",
  themeColor: "#0a0a0a",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "周游" },
  openGraph: {
    title: "周游 SYUYU — ウォーキングコース提案",
    description: "同じ道を戻らず、ぐるりと巡って還る散歩を。",
    type: "website",
  },
  other: { "mobile-web-app-capable": "yes" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
