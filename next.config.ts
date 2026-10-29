
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: new URL(
          process.env.NEXT_PUBLIC_SUPABASE_URL!
        ).hostname,
        pathname: "/storage/v1/object/public/player-images/**",
      },
    ],
  },
};

export default nextConfig;

