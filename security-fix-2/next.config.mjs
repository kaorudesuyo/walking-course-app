/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// Content-Security-Policy:
// アプリが通信・埋め込みを行う先だけをホワイトリスト化する
const csp = [
  "default-src 'self'",
  // Next.js のハイドレーション用インラインスクリプトに 'unsafe-inline' が必要
  // 開発時のみ 'unsafe-eval'（HMR用）を許可
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // アプリは外部画像を読み込まないため最小権限に絞る
  "img-src 'self' data:",
  "manifest-src 'self'",
  // ブラウザから直接呼び出す外部API（これ以外への通信をブロック）
  "connect-src 'self' https://overpass-api.de https://overpass.kumi.systems https://maps.mail.ru https://router.project-osrm.org https://routing.openstreetmap.de https://nominatim.openstreetmap.org",
  // 地図の埋め込みは Google Maps のみ許可
  "frame-src https://maps.google.com https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  // このアプリを他サイトのiframeに埋め込むことを禁止（クリックジャッキング対策）
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // MIMEタイプの誤解釈によるスクリプト実行を防止
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 旧ブラウザ向けクリックジャッキング対策（frame-ancestorsの補完）
  { key: "X-Frame-Options", value: "DENY" },
  // 外部サイトへ渡すリファラ情報を最小化
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 位置情報は自サイトのみ許可、カメラ・マイク等は全面禁止
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()" },
  // HTTPS を強制（2年間）
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
