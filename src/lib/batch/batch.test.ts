import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import type { MinutaRequest } from "@/lib/minuta/schema";
import { MAX_BATCH_ROWS, SpreadsheetError, parseCsv, parseXlsx } from "./spreadsheet";
import { fillRequestTemplate, fillText, rowLabel, unknownPlaceholders } from "./template";

const TEMPLATE: MinutaRequest = {
  documentType: "outro",
  customDocumentType: "Notificação de débito de {{tributo}}",
  parties: [
    { name: "Município de Canoas", role: "Notificante", qualification: "" },
    { name: "{{Nome}}", role: "Notificado", qualification: "CPF {{cpf}}, {{ endereço }}" },
  ],
  clauses: "Débito de R$ {{valor}} vencido em {{vencimento}}.",
  persona: "agressivo",
  useLibrary: false,
  approvedClauseIds: [],
};

describe("parseCsv", () => {
  it("reads semicolon-separated files with a BOM, dropping blank rows", () => {
    expect(parseCsv("﻿nome;cpf;valor\nAna;111;1.200,00\n\n;;\nJoão;222;80,50\n")).toEqual({
      columns: ["nome", "cpf", "valor"],
      rows: [
        { nome: "Ana", cpf: "111", valor: "1.200,00" },
        { nome: "João", cpf: "222", valor: "80,50" },
      ],
    });
  });

  it("rejects missing headers, duplicate columns, empty sheets and oversized batches", () => {
    expect(() => parseCsv("nome,nome\na,b")).toThrow(SpreadsheetError);
    expect(() => parseCsv("nome\n")).toThrow("não tem linhas");
    const tooMany = ["nome", ...Array.from({ length: MAX_BATCH_ROWS + 1 }, (_, index) => `p${index}`)].join("\n");
    expect(() => parseCsv(tooMany)).toThrow(`${MAX_BATCH_ROWS} linhas`);
  });
});

describe("parseXlsx", () => {
  it("reads the first sheet of a workbook", async () => {
    const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>
      <row r="1"><c r="A1" t="inlineStr"><is><t>nome</t></is></c><c r="B1" t="inlineStr"><is><t>valor</t></is></c></row>
      <row r="2"><c r="A2" t="inlineStr"><is><t>Ana</t></is></c><c r="B2"><v>1200.5</v></c></row>
    </sheetData></worksheet>`;
    const xlsx = zipSync({
      "[Content_Types].xml": strToU8(`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`),
      "_rels/.rels": strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
      "xl/workbook.xml": strToU8(`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Planilha1" sheetId="1" r:id="rId1"/></sheets></workbook>`),
      "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`),
      "xl/worksheets/sheet1.xml": strToU8(sheet),
    });

    const buffer = xlsx.buffer.slice(xlsx.byteOffset, xlsx.byteOffset + xlsx.byteLength) as ArrayBuffer;
    expect(await parseXlsx(buffer)).toEqual({ columns: ["nome", "valor"], rows: [{ nome: "Ana", valor: "1200.5" }] });
  });

  it("reports a file that is not a workbook", async () => {
    await expect(parseXlsx(new ArrayBuffer(8))).rejects.toThrow(SpreadsheetError);
  });
});

describe("template filling", () => {
  const ROW = { Nome: "Ana Souza", CPF: "111.222.333-44", Endereco: "Rua A, 10", tributo: "IPTU", valor: "1.200,00", vencimento: "" };

  it("fills placeholders ignoring case, accents and spaces, marking empty values to fill in", () => {
    const filled = fillRequestTemplate(TEMPLATE, ROW);
    expect(filled.customDocumentType).toBe("Notificação de débito de IPTU");
    expect(filled.parties[1]).toEqual({
      name: "Ana Souza",
      role: "Notificado",
      qualification: "CPF 111.222.333-44, Rua A, 10",
    });
    expect(filled.clauses).toBe("Débito de R$ 1.200,00 vencido em [PREENCHER: vencimento].");
  });

  it("leaves text without placeholders alone", () => {
    expect(fillText("Sem variáveis.", ROW)).toBe("Sem variáveis.");
  });

  it("labels a row by the party whose name comes from the spreadsheet", () => {
    expect(rowLabel(TEMPLATE, fillRequestTemplate(TEMPLATE, ROW))).toBe("Ana Souza");
    const fixedNames = { ...TEMPLATE, parties: TEMPLATE.parties.map((party) => ({ ...party, name: "Fixo" })) };
    expect(rowLabel(fixedNames, fixedNames)).toBe("Fixo");
  });

  it("lists placeholders that match no column", () => {
    expect(unknownPlaceholders(TEMPLATE, ["nome", "cpf", "endereço", "valor", "vencimento"])).toEqual(["tributo"]);
  });
});
