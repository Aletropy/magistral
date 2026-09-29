import { readFileSync } from "node:fs";
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

/** Shown in the account menu and the health check; the Docker build passes the commit in MAGISTRAL_COMMIT. */
const PACKAGE_VERSION = (JSON.parse(readFileSync("./package.json", "utf8")) as { version: string }).version;

/**
 * Files loaded at runtime from computed paths, which the standalone output's tracer can't see: the
 * sqlite-vec extension, onnxruntime's native binding (Linux builds only; the image is Linux) and the PDF
 * fallback font.
 */
const RUNTIME_FILES = [
  // sqlite-vec finds its platform package by name (import.meta.resolve), so the whole package and the
  // pnpm link beside sqlite-vec must be there, not just the .so file.
  "./node_modules/.pnpm/sqlite-vec-linux-*/node_modules/sqlite-vec-linux-*/**",
  "./node_modules/.pnpm/sqlite-vec@*/node_modules/sqlite-vec-linux-*/**",
  // Transformers.js loads onnxruntime-node with createRequire from its own folder; copy it there with only
  // its Linux binaries.
  "./node_modules/.pnpm/@huggingface+transformers@*/node_modules/onnxruntime-node/package.json",
  "./node_modules/.pnpm/@huggingface+transformers@*/node_modules/onnxruntime-node/dist/**",
  "./node_modules/.pnpm/@huggingface+transformers@*/node_modules/onnxruntime-node/lib/**",
  "./node_modules/.pnpm/@huggingface+transformers@*/node_modules/onnxruntime-node/bin/napi-v6/linux/**",
  "./node_modules/.pnpm/onnxruntime-node@*/node_modules/onnxruntime-common/**",
  "./node_modules/.pnpm/node_modules/onnxruntime-common/**",
  "./node_modules/dejavu-fonts-ttf/ttf/DejaVuSans*.ttf",
];

const nextConfig: NextConfig = {
  // A self-contained server in .next/standalone, which the Docker image runs.
  output: "standalone",
  outputFileTracingIncludes: { "/**/*": RUNTIME_FILES },
  env: {
    NEXT_PUBLIC_MAGISTRAL_VERSION: PACKAGE_VERSION,
    NEXT_PUBLIC_MAGISTRAL_COMMIT: process.env.MAGISTRAL_COMMIT ?? "",
  },
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
