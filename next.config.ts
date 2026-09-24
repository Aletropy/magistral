import type { NextConfig } from "next";

/**
 * The dev server only serves its dev resources (hot reload, dev chunks) to localhost; without them a page
 * opened from another device never becomes interactive. Private-network addresses are allowed so the app
 * can be tried on a phone over Wi-Fi (e.g. http://192.168.1.6:3000); MAGISTRAL_DEV_ORIGINS adds other
 * hostnames, comma-separated. Development only: production builds ignore this list.
 */
const PRIVATE_NETWORK_ORIGINS = ["192.168.*.*", "10.*.*.*", "*.local"];
const EXTRA_DEV_ORIGINS_ENV_VAR = "MAGISTRAL_DEV_ORIGINS";

function extraDevOrigins(): string[] {
  return (process.env[EXTRA_DEV_ORIGINS_ENV_VAR] ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const nextConfig: NextConfig = {
  // pdfmake/PDFKit read their bundled font metrics from disk; sqlite-vec and onnxruntime (behind
  // Transformers.js) load native binaries from their package folders. All load with native require.
  serverExternalPackages: ["pdfmake", "sqlite-vec", "@huggingface/transformers", "onnxruntime-node"],
  allowedDevOrigins: [...PRIVATE_NETWORK_ORIGINS, ...extraDevOrigins()],
};

export default nextConfig;
