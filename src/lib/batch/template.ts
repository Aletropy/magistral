import type { MinutaRequest } from "@/lib/minuta/schema";
import { normalizeForMatch } from "@/lib/text/normalizeForMatch";

const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;

function lookup(row: Record<string, string>): (column: string) => string | undefined {
  const byKey = new Map(Object.entries(row).map(([column, value]) => [normalizeForMatch(column.trim()), value]));
  return (column) => byKey.get(normalizeForMatch(column.trim()));
}

/** Replaces {{coluna}} with the row's value; missing or empty values become [PREENCHER: coluna]. */
export function fillText(text: string, row: Record<string, string>): string {
  const valueOf = lookup(row);
  return text.replace(PLACEHOLDER, (_, column: string) => valueOf(column) || `[PREENCHER: ${column.trim()}]`);
}

/** The minuta request for one spreadsheet row: every free-text field of the template is filled. */
export function fillRequestTemplate(template: MinutaRequest, row: Record<string, string>): MinutaRequest {
  return {
    ...template,
    customDocumentType: fillText(template.customDocumentType, row),
    parties: template.parties.map((party) => ({
      name: fillText(party.name, row),
      role: fillText(party.role, row),
      qualification: fillText(party.qualification, row),
    })),
    clauses: fillText(template.clauses, row),
  };
}

/** Placeholders used in the template that match no spreadsheet column (ignoring case and accents). */
export function unknownPlaceholders(template: MinutaRequest, columns: string[]): string[] {
  const known = new Set(columns.map((column) => normalizeForMatch(column.trim())));
  const texts = [
    template.customDocumentType,
    template.clauses,
    ...template.parties.flatMap((party) => [party.name, party.role, party.qualification]),
  ];
  const used = texts.flatMap((text) => [...text.matchAll(PLACEHOLDER)].map((match) => match[1].trim()));
  return [...new Set(used)].filter((column) => !known.has(normalizeForMatch(column)));
}

/**
 * A short label for a row, used in the item list and the file names: the name of the first party whose
 * name comes from the spreadsheet (the recipient), or the first party when no name uses a placeholder.
 */
export function rowLabel(template: MinutaRequest, filled: MinutaRequest): string {
  const index = template.parties.findIndex((party) => party.name.match(PLACEHOLDER));
  return filled.parties[Math.max(index, 0)]?.name ?? "";
}
