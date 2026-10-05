import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/cellular-automata/:experiment(1|2|3|4|5|6)",
        destination: "/cellular-automata/colour/:experiment",
        permanent: true,
      },
      {
        source: "/clock",
        destination: "/fractal/clock/1",
        permanent: true,
      },
      {
        source: "/clock/:experiment(1|2|3)",
        destination: "/fractal/clock/:experiment",
        permanent: true,
      },
    ];
  },
  allowedDevOrigins: ["macbook-air-5.local"],
  devIndicators: false,
  compiler: {
    styledComponents: true,
  },
  turbopack: {
    root: workspaceRoot,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
