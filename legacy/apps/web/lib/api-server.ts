/**
 * Server-side API base (Doc 4 public-forms SSR route).
 *
 * The browser talks to the API through the Next same-origin proxy
 * (rewrites in next.config.mjs, API_INTERNAL_URL target). Server components
 * skip the proxy and fetch the API directly on the internal URL.
 */
export function serverApiBase(): string {
  const internal = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3000';
  const url = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) return internal; // same-origin proxy mode (this preview)
  if (url.includes('.e2b.app')) return internal; // preview hostname not routable inside the sandbox
  return url; // fully separate deployment
}
