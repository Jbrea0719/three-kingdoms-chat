import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 배포 시 src/data 폴더의 파일도 함께 포함되도록 설정
  // (기본적으로 Vercel은 JS 코드만 올리고 텍스트 파일은 빠뜨림)
  outputFileTracingIncludes: {
    "/api/chat": ["./src/data/**/*"],
  },
};

export default nextConfig;
