import "server-only";
import { createStyleExtractor, type StyleExtractor } from "@/lib/style/extractor";
import { getStructuredGenerator } from "./getStructuredGenerator";

export function getStyleExtractor(): StyleExtractor {
  return createStyleExtractor(getStructuredGenerator("style_capture"));
}
