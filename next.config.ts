import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfmake/PDFKit read their bundled font metrics from disk; sqlite-vec and onnxruntime (behind
  // Transformers.js) load native binaries from their package folders. All load with native require.
  serverExternalPackages: ["pdfmake", "sqlite-vec", "@huggingface/transformers", "onnxruntime-node"],
};

export default nextConfig;
