import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// Static export: every page becomes plain HTML in `out/`, so the site hosts
// free on Render's static tier (or Vercel/Netlify) with no server to keep awake.
// The customer tracking page reads the shop/order from the URL in the browser;
// in production the host rewrites /track/* to /track/index.html (see render.yaml).
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  // Lets a second build/dev run use its own folder instead of clobbering `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // `next dev` doesn't use the host's rewrite, so do the same thing here:
  // /track/<shop>/<order> → the tracking page. (Static export ignores rewrites,
  // so this is dev-only.)
  ...(isDev
    ? {
        async rewrites() {
          return [{ source: '/track/:shop/:order', destination: '/track/' }];
        },
      }
    : {}),
};

export default nextConfig;
