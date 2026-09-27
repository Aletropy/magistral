import type { NextConfig } from "next";
import { MAX_LIBRARY_UPLOAD_REQUEST_BYTES } from "./src/lib/documents/formats";

/**
 * The dev server only serves its dev resources (hot reload, dev chunks) to the hosts listed here; without
 * them a page opened from another device never becomes interactive. MAGISTRAL_DEV_ORIGINS lists the
 * hostnames used to reach the dev server from other devices, comma-separated (e.g. "192.168.1.6").
 * Development only: production builds ignore this list.
 */
const DEV_ORIGINS_ENV_VAR = "MAGISTRAL_DEV_ORIGINS";

function devOrigins(): string[] {
  return (process.env[DEV_ORIGINS_ENV_VAR] ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/** Sent with every response, static files included; the CSP itself is set per request by src/proxy.ts. */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // pdfmake/PDFKit read their bundled font metrics from disk; sqlite-vec and onnxruntime (behind
  // Transformers.js) load native binaries from their package folders. All load with native require.
  serverExternalPackages: ["pdfmake", "sqlite-vec", "@huggingface/transformers", "onnxruntime-node"],
  allowedDevOrigins: devOrigins(),
  poweredByHeader: false,
  experimental: {
    // The proxy buffers request bodies up to this size before the route reads them; library uploads are the largest.
    proxyClientMaxBodySize: MAX_LIBRARY_UPLOAD_REQUEST_BYTES,
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
