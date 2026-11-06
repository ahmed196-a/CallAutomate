import type { NextConfig } from "next";

// upgrade-insecure-requests and HSTS must only be enabled when serving over HTTPS (e.g. Vercel or when NEXT_PUBLIC_FORCE_HTTPS is set)
// On HTTP (local network / phone testing over LAN IP), upgrade-insecure-requests causes browsers to rewrite subresources to https://<lan-ip>:3000, failing with ERR_SSL_PROTOCOL_ERROR
const isHttps = Boolean(
  process.env.VERCEL ||
  process.env.NEXT_PUBLIC_FORCE_HTTPS === "1" ||
  process.env.FORCE_HTTPS === "1"
);

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob: https:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
];

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspDirectives.join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=()" },
  ...(isHttps
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
