"use client";

import { useMemo, useState } from "react";
import { RedlineViewer } from "@/components/RedlineViewer";
import { FileInput } from "@/components/ui/FileInput";
import { Textarea } from "@/components/ui/textarea";
import { useDocumentText } from "@/hooks/useDocumentText";
import { locateClauseSections, replaceSectionBody } from "@/lib/clauses/locateClauseSections";
import { DOCUMENT_ACCEPT } from "@/lib/documents/formats";
import type { ApprovedClauseText } from "@/lib/minuta/types";

type OriginalSource = "clauses" | "pasted";

const PASTE_ROWS = 8;

interface RedlinePanelProps {
  markdown: string;
  /** The approved clauses the minuta was assembled from, as the user wrote them. */
  approvedClauses: ApprovedClauseText[];
  onApply: (markdown: string) => void;
}

/** One redline per approved clause: the approved text against the section the AI wrote for it. */
function ApprovedClausesRedline({ markdown, approvedClauses, onApply }: RedlinePanelProps) {
  const sections = useMemo(
    () => locateClauseSections(markdown, approvedClauses.map((clause) => clause.title)),
    [markdown, approvedClauses],
  );

  return (
    <div className="flex flex-col gap-6">
      {approvedClauses.map((clause, index) => {
        const section = sections[index];
        return (
          <section key={clause.title} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{clause.title}</h3>
            {section ? (
              <RedlineViewer
                key={section.body}
                original={clause.body}
                revised={section.body}
                onApply={(body) => onApply(replaceSectionBody(markdown, section, body))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Não encontramos esta cláusula pelo título na minuta; a IA pode tê-lo renomeado. Compare colando o
                texto original.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Picks the original (the approved clauses, pasted text or an uploaded file) and shows the redline against it. */
export function RedlinePanel({ markdown, approvedClauses, onApply }: RedlinePanelProps) {
  const hasClauses = approvedClauses.length > 0;
  const [source, setSource] = useState<OriginalSource>(hasClauses ? "clauses" : "pasted");
  const [pasted, setPasted] = useState("");
  const { error: fileError, read } = useDocumentText();

  async function loadFile(file: File | undefined) {
    if (!file) return;
    const text = await read(file);
    if (text === null) return;
    setPasted(text);
    setSource("pasted");
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <legend className="px-1 text-sm font-medium">Comparar com</legend>
        {hasClauses && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="redline-source"
              className="accent-primary"
              checked={source === "clauses"}
              onChange={() => setSource("clauses")}
            />
            Cláusulas aprovadas (texto original de cada uma)
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="redline-source"
            className="accent-primary"
            checked={source === "pasted"}
            onChange={() => setSource("pasted")}
          />
          Texto original (cole abaixo ou carregue um arquivo)
        </label>
        {source === "pasted" && (
          <div className="flex flex-col gap-2">
            <Textarea
              aria-label="Texto original"
              rows={PASTE_ROWS}
              placeholder="Cole aqui o modelo ou a versão anterior do documento."
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
            />
            <FileInput
              ariaLabel="Carregar original em PDF ou DOCX"
              accept={DOCUMENT_ACCEPT}
              onFiles={([chosen]) => void loadFile(chosen)}
            />
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
          </div>
        )}
      </fieldset>

      {source === "clauses" ? (
        <ApprovedClausesRedline markdown={markdown} approvedClauses={approvedClauses} onApply={onApply} />
      ) : pasted.trim() ? (
        <RedlineViewer key={pasted} original={pasted} revised={markdown} onApply={onApply} />
      ) : (
        <p className="text-sm text-muted-foreground">Informe o texto original para ver as diferenças.</p>
      )}
    </div>
  );
}
