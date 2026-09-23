import Papa from "papaparse";
import { readSheet, type CellValue } from "read-excel-file/universal";

export const MAX_BATCH_ROWS = 200;
export const MAX_BATCH_COLUMNS = 40;
export const MAX_CELL_CHARS = 2000;

export interface Spreadsheet {
  columns: string[];
  rows: Record<string, string>[];
}

export class SpreadsheetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpreadsheetError";
  }
}

const SPREADSHEET_EXTENSIONS = [".csv", ".xlsx"] as const;
export const SPREADSHEET_ACCEPT = SPREADSHEET_EXTENSIONS.join(",");

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

function cellToText(value: CellValue | null): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return dateFormatter.format(value);
  return String(value).trim();
}

/** Turns a header row plus data rows into records, dropping blank rows and enforcing the batch limits. */
export function toSpreadsheet(table: string[][]): Spreadsheet {
  const [header = [], ...body] = table;
  const columns = header.map((cell) => cell.trim());
  if (columns.length === 0 || columns.every((column) => !column)) {
    throw new SpreadsheetError("A primeira linha da planilha deve ter os nomes das colunas.");
  }
  if (columns.length > MAX_BATCH_COLUMNS) throw new SpreadsheetError(`Use no máximo ${MAX_BATCH_COLUMNS} colunas.`);
  const duplicate = columns.find((column, index) => column && columns.indexOf(column) !== index);
  if (duplicate) throw new SpreadsheetError(`A coluna “${duplicate}” aparece mais de uma vez.`);

  const rows = body
    .filter((cells) => cells.some((cell) => cell.trim()))
    .map((cells) =>
      Object.fromEntries(
        columns.flatMap((column, index) => (column ? [[column, (cells[index] ?? "").trim().slice(0, MAX_CELL_CHARS)]] : [])),
      ),
    );
  if (rows.length === 0) throw new SpreadsheetError("A planilha não tem linhas de dados.");
  if (rows.length > MAX_BATCH_ROWS) throw new SpreadsheetError(`Use no máximo ${MAX_BATCH_ROWS} linhas por lote.`);
  return { columns: columns.filter(Boolean), rows };
}

export function parseCsv(text: string): Spreadsheet {
  // Papa detects the delimiter, so Excel's ";" exports in pt-BR locales work too.
  const { data } = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: true });
  return toSpreadsheet(data);
}

export async function parseXlsx(bytes: ArrayBuffer): Promise<Spreadsheet> {
  let sheet;
  try {
    sheet = await readSheet(bytes);
  } catch {
    throw new SpreadsheetError("Não foi possível ler a planilha XLSX.");
  }
  return toSpreadsheet(sheet.map((row) => row.map(cellToText)));
}

/** Parses an uploaded CSV or XLSX file (the first sheet) into column names and row records. */
export async function parseSpreadsheetFile(file: File): Promise<Spreadsheet> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(await file.text());
  if (name.endsWith(".xlsx")) return parseXlsx(await file.arrayBuffer());
  throw new SpreadsheetError("Envie uma planilha CSV ou XLSX.");
}
