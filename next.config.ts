import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfmake/PDFKit read their bundled font metrics from disk, and sqlite-vec resolves its native
  // extension from its own package folder, so both load with native require.
  serverExternalPackages: ["pdfmake", "sqlite-vec"],
};

export default nextConfig;
