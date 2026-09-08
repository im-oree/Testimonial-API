/**
 * Next config — same-origin API proxy for the demo/preview.
 *
 * When NEXT_PUBLIC_API_URL is NOT set, the browser talks to `/v1/*` (and
 * `/live/*` for realtime) on this origin and Next forwards those requests to
 * the API on API_INTERNAL_URL (default the local API on port 3000). This makes
 * the preview independent of per-sandbox public hostnames and sidesteps
 * cross-origin cookie/CORS issues entirely. Set NEXT_PUBLIC_API_URL in the
 * client (and/or an external API base) when the API lives on another host.
 */
const API_INTERNAL = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/v1/:path*', destination: `${API_INTERNAL}/v1/:path*` },
      { source: '/live/:path*', destination: `${API_INTERNAL}/live/:path*` },
    ];
  },
};

export default nextConfig;
