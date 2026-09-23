import type { HeadingLevel } from "@/lib/markdown/types";

/** Shared typography and page geometry, so DOCX and PDF look the same. */
export const BODY_FONT_SIZE_PT = 12;
export const HEADING_FONT_SIZE_PT: Record<HeadingLevel, number> = { 1: 16, 2: 13, 3: 12, 4: 12 };
export const LINE_HEIGHT = 1.3;
export const PARAGRAPH_SPACING_AFTER_PT = 8;
export const HEADING_SPACING_BEFORE_PT = 14;
export const TITLE_HEADING_LEVEL: HeadingLevel = 1;

export const PAGE_WIDTH_CM = 21;
export const PAGE_HEIGHT_CM = 29.7;
export const PAGE_MARGIN_CM = 2.5;
export const LIST_INDENT_CM = 0.75;
export const LIST_MARKER_WIDTH_CM = 0.75;

const CM_PER_INCH = 2.54;
const POINTS_PER_INCH = 72;
const TWIPS_PER_POINT = 20;

export function cmToPoints(cm: number): number {
  return (cm / CM_PER_INCH) * POINTS_PER_INCH;
}

export function pointsToTwips(points: number): number {
  return Math.round(points * TWIPS_PER_POINT);
}

export function cmToTwips(cm: number): number {
  return pointsToTwips(cmToPoints(cm));
}

/** Left indent of a list item's text, including its marker column. */
export function listTextIndentCm(depth: number): number {
  return LIST_INDENT_CM * depth + LIST_MARKER_WIDTH_CM;
}
