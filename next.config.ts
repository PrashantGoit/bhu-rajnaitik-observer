import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native bindings — keep on the server, never bundle for the browser.
  serverExternalPackages: ["@napi-rs/canvas", "sharp"],
};

export default nextConfig;
