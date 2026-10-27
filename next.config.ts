import type { NextConfig } from "next";

// `PAGES_BASE_PATH=/<repo> next build` makes the static GitHub Pages build in
// out/ (.github/workflows/pages.yml). Static export can't run partial prerendering,
// so cacheComponents / partialPrefetching are off for that build only; the demo
// is one client-rendered page and doesn't rely on them.
const pagesBasePath = process.env.PAGES_BASE_PATH;
const pages = pagesBasePath !== undefined;

const nextConfig: NextConfig = {
  // The dev-mode "N" badge sat over the Piramid logo in the sidebar during rehearsals
  devIndicators: false,
  cacheComponents: !pages,
  partialPrefetching: !pages,
  ...(pages && {
    output: "export",
    basePath: pagesBasePath,
    // Plain <img> files under public/ need the same prefix (see lib/asset.ts)
    env: { NEXT_PUBLIC_BASE_PATH: pagesBasePath },
  }),
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
