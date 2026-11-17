import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/adapter-neon", "@neondatabase/serverless"],
  experimental: {
    optimizePackageImports: ["lucide-react", "radix-ui", "sonner"],
  },
};

export default nextConfig;
