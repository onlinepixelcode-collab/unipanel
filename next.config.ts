import type { NextConfig } from "next";

const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/unipanel";

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  reactStrictMode: true,
  devIndicators: false, // no Next.js badge while reviewing locally (it never ships to production)
  poweredByHeader: false,
  output: isStatic ? "export" : undefined,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_STATIC: isStatic ? "1" : "0" },
  // Server-only route handlers are named *.api.ts so a static export simply leaves them out.
  pageExtensions: isStatic ? ["tsx", "ts"] : ["tsx", "ts", "api.ts"],
  transpilePackages: ["three"],
};

export default nextConfig;
