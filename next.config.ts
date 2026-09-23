import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfmake/PDFKit read their bundled font metrics from disk, so load them with native require.
  serverExternalPackages: ["pdfmake"],
};

export default nextConfig;
