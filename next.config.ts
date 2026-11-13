import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  devIndicators: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return ["combo-previews", "combo-images", "card-images", "player-images"].map((folder) => ({
      source: `/${folder}/:path*`,
      headers: [
        { key: "Cache-Control", value: "public, max-age=604800" },
      ],
    }));
  },
};

export default nextConfig;