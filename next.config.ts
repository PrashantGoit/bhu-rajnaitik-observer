import type { NextConfig } from "next";

const isStatic = process.env.STATIC === "1";
// Repo name for GitHub Pages basePath. Override with PAGES_BASE_PATH if needed.
const basePath = isStatic
  ? process.env.PAGES_BASE_PATH ?? "/bhu-rajnaitik-observer"
  : undefined;

const nextConfig: NextConfig = {
  // Native bindings — keep on the server, never bundle for the browser.
  serverExternalPackages: ["@napi-rs/canvas", "sharp"],
  ...(isStatic
    ? {
        output: "export" as const,
        basePath,
        assetPrefix: basePath,
        images: { unoptimized: true },
        trailingSlash: true,
        env: {
          NEXT_PUBLIC_STATIC: "1",
          NEXT_PUBLIC_BASE_PATH: basePath ?? "",
        },
      }
    : {}),
};

export default nextConfig;
