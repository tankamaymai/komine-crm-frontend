import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ['@komine/types'],
  // Docker 運用（komine-local のローカルサーバ / 将来の ECS）用に自己完結サーバを出力する。
  // Vercel のビルドには影響しない（Vercel は出力を独自に扱う）。
  output: 'standalone',
  // 画面右下の Next.js Dev Tools / 開発インジケータを非表示にする (#189)。
  // 本番ビルドでは元々出ないが、非本番ビルド配信時にも管理画面へ出さないため明示的に無効化。
  devIndicators: false,
  // 月の請求は人数が多いと30秒を超える。途中で切れると画面が壊れた返事を受け取る。
  experimental: {
    proxyTimeout: 180_000,
  },
  // Next.js 16 からは組み立てに Turbopack を使う。
  // 共有の型（../packages/types）は画面フォルダの外にあるので、そこまで探せるようにする。
  // zod は画面側の node_modules から解決する（型パッケージがシンボリンクのため）。
  turbopack: {
    root: path.join(__dirname, ".."),
    resolveAlias: {
      zod: "./node_modules/zod",
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
