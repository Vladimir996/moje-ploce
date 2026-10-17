import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000/api";

const nextConfig: NextConfig = {
  // Omoti ploča se čuvaju na backend-u; browser ih traži sa /covers/... a
  // Next.js ih proksira, pa backend URL nikad ne ide direktno u browser.
  async rewrites() {
    return [{ source: "/covers/:path*", destination: `${API_URL}/uploads/:path*` }];
  },
};

export default nextConfig;
