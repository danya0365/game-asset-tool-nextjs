import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Local `next dev` only. No-ops during `next build` / the Workers bundle.
initOpenNextCloudflareForDev();
