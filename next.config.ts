import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 같은 와이파이의 폰에서 dev 서버 접속 허용 (없으면 JS가 막혀 정적 페이지처럼 보임)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
