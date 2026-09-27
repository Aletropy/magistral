"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MinutaForm } from "@/components/MinutaForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/FileInput";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { WarningCallout } from "@/components/ui/WarningCallout";
import { batchPath } from "@/lib/batch/paths";
import { MAX_BATCH_NAME_CHARS } from "@/lib/batch/schema";
import {
  MAX_BATCH_ROWS,
  SPREADSHEET_ACCEPT,
  SpreadsheetError,
  parseSpreadsheetFile,
  type Spreadsheet,
} from "@/lib/batch/spreadsheet";
import { fillRequestTemplate, unknownPlaceholders } from "@/lib/batch/template";
import { NETWORK_ERROR_MESSAGE, postJson, readErrorMessage } from "@/lib/http/client";
import type { BatchCreatedResponseBody } from "@/lib/http/contracts";
import { BATCHES_ENDPOINT } from "@/lib/http/endpoints";
import { initialMinutaValues } from "@/lib/minuta/formDefaults";
import type { MinutaFormOptions } from "@/lib/minuta/loadMinutaFormOptions";
import type { MinutaRequest } from "@/lib/minuta/schema";
import { plural } from "@/lib/text/plural";

const CREATE_FAILED = "Não foi possível criar o lote. Tente novamente.";
/** Served from public/: a small CSV with fictitious debtors to try the batch flow. */
const SAMPLE_SPREADSHEET_PATH = "/exemplos/devedores.csv";
const FILE_EXTENSION = /\.[^.]+$/;

function placeholder(column: string): string {
  return `{{${column}}}`;
}

function PreviewRow({ request }: { request: MinutaRequest }) {
  return (
    <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
      {request.customDocumentType && (
        <>
          <dt className="text-muted-foreground">Documento</dt>
          <dd>{request.customDocumentType}</dd>
        </>
      )}
      {request.parties.map((party, index) => (
        <div key={index} className="contents">
          <dt className="text-muted-foreground">{party.role}</dt>
          <dd>
            {party.name}
            {party.qualification && <span className="text-muted-foreground"> — {party.qualification}</span>}
          </dd>
        </div>
      ))}
      {request.clauses && (
        <>
          <dt className="text-muted-foreground">Cláusulas</dt>
          <dd className="whitespace-pre-line">{request.clauses}</dd>
        </>
      )}
      {request.baseDocument && (
        <>
          <dt className="text-muted-foreground">Documento base</dt>
          <dd>{request.baseDocument.name || "Documento enviado"}</dd>
        </>
      )}
    </dl>
  );
}

/** Upload a spreadsheet, write the minuta template with {{coluna}} placeholders, check the first row, start. */
export function BatchCreator(options: MinutaFormOptions) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Spreadsheet | null>(null);
  const [name, setName] = useState("");
  const [values, setValues] = useState(() => initialMinutaValues(options.personas));
  const [template, setTemplate] = useState<MinutaRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    setError(null);
    setSheet(null);
    setTemplate(null);
    if (!file) return;
    try {
      setSheet(await parseSpreadsheetFile(file));
      setName((current) => current || file.name.replace(FILE_EXTENSION, ""));
    } catch (caught) {
      setError(caught instanceof SpreadsheetError ? caught.message : "Não foi possível ler a planilha.");
    }
  }

  async function copyPlaceholder(column: string) {
    await navigator.clipboard?.writeText(placeholder(column)).catch(() => {});
    setCopied(column);
  }

  async function handleCreate() {
    if (!sheet || !template) return;
    setIsCreating(true);
    setError(null);
    try {
      const response = await postJson(BATCHES_ENDPOINT, { name, template, rows: sheet.rows });
      if (!response.ok) {
        setError(await readErrorMessage(response, CREATE_FAILED));
        return;
      }
      const { id } = (await response.json()) as BatchCreatedResponseBody;
      router.push(batchPath(id));
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsCreating(false);
    }
  }

  const missing = sheet && template ? unknownPlaceholders(template, sheet.columns) : [];

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium">1. Planilha</h2>
          <FormField
            label="Arquivo CSV ou XLSX"
            htmlFor="spreadsheet"
            hint={`A primeira linha tem os nomes das colunas; cada linha seguinte vira uma minuta (até ${MAX_BATCH_ROWS}).`}
          >
            <FileInput id="spreadsheet" accept={SPREADSHEET_ACCEPT} onFiles={([chosen]) => void handleFile(chosen)} />
          </FormField>
          <a href={SAMPLE_SPREADSHEET_PATH} download className="self-start text-sm text-primary hover:underline">
            Baixar planilha de exemplo (dados fictícios)
          </a>
          {sheet && (
            <>
              <p className="text-sm">
                {plural(sheet.rows.length, "linha", "linhas")}. Toque numa coluna para copiar o marcador e cole-o
                nos campos do modelo:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sheet.columns.map((column) => (
                  <button key={column} type="button" onClick={() => void copyPlaceholder(column)}>
                    <Badge variant={copied === column ? "default" : "outline"} className="font-mono">
                      {placeholder(column)}
                    </Badge>
                  </button>
                ))}
              </div>
              <FormField label="Nome do lote" htmlFor="batch-name">
                <Input
                  id="batch-name"
                  maxLength={MAX_BATCH_NAME_CHARS}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </FormField>
            </>
          )}
        </section>

        {sheet && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">2. Modelo da minuta</h2>
            <MinutaForm
              {...options}
              values={values}
              onValuesChange={setValues}
              submitLabel="Pré-visualizar primeira linha"
              busyLabel="Criando lote…"
              isSubmitting={isCreating}
              onSubmit={setTemplate}
            />
          </section>
        )}
      </div>

      <section className="flex flex-col gap-4" aria-live="polite">
        {error && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {sheet && template ? (
          <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-medium">3. Conferir e iniciar</h2>
            {missing.length > 0 && (
              <WarningCallout>
                ⚠ Sem coluna correspondente: {missing.map(placeholder).join(", ")}. Esses campos sairão como
                [PREENCHER: …].
              </WarningCallout>
            )}
            <p className="text-sm text-muted-foreground">Primeira linha preenchida:</p>
            <PreviewRow request={fillRequestTemplate(template, sheet.rows[0])} />
            <Button size="lg" className="self-start" disabled={isCreating || !name.trim()} onClick={handleCreate}>
              {isCreating ? "Criando lote…" : `Iniciar lote (${plural(sheet.rows.length, "minuta", "minutas")})`}
            </Button>
            <p className="text-xs text-muted-foreground">
              As minutas são geradas em segundo plano, duas por vez, com novas tentativas automáticas quando a
              IA estiver sobrecarregada. Você pode fechar esta página.
            </p>
          </div>
        ) : (
          <div className="hidden min-h-64 items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground lg:flex">
            {sheet
              ? "Preencha o modelo usando os marcadores e clique em “Pré-visualizar primeira linha”."
              : "Comece enviando a planilha com os dados de cada minuta."}
          </div>
        )}
      </section>
    </div>
  );
}
