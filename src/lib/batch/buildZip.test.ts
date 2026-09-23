import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { batchFileName, buildBatchZip } from "./buildZip";

describe("buildBatchZip", () => {
  it("zips one rendered file per item, named by row and label", async () => {
    const zip = await buildBatchZip(
      [
        { position: 1, label: "Ana Souza", markdown: "# NOTIFICAÇÃO\n\nPrezada Ana." },
        { position: 12, label: "", markdown: "# NOTIFICAÇÃO\n\nPrezado contribuinte." },
      ],
      "docx",
    );
    const files = unzipSync(zip);

    expect(Object.keys(files)).toEqual(["001-ana-souza.docx", "012-minuta.docx"]);
    expect(Buffer.from(files["001-ana-souza.docx"].subarray(0, 2)).toString("latin1")).toBe("PK");
  });

  it("strips accents and punctuation from labels", () => {
    expect(batchFileName({ position: 7, label: "João D'Ávila & Cia." }, "pdf")).toBe("007-joao-d-avila-cia.pdf");
  });
});
