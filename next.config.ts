import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-mode "N" badge sat over the Piramid logo in the sidebar during rehearsals
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
