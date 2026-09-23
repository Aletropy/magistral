"use client";

import { useState, type FormEvent } from "react";
import { ApplyStyleToPersona, type EditablePersona } from "@/components/ApplyStyleToPersona";
import { PersonaEditor } from "@/components/PersonaEditor";
import { StyleProfileCard } from "@/components/StyleProfileCard";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { useStyleCapture } from "@/hooks/useStyleCapture";
import { DOCUMENT_ACCEPT, MAX_UPLOAD_MEBIBYTES } from "@/lib/documents/formats";
import { EMPTY_PERSONA, type PersonaFormValues } from "@/lib/personas/schema";
import type { StyleCaptureResult } from "@/lib/style/captureStyle";

function toPersonaDraft(capture: StyleCaptureResult): PersonaFormValues {
  return {
    ...EMPTY_PERSONA,
    name: capture.suggestedName,
    description: `Estilo capturado de ${capture.fileName}.`,
    systemInstruction: capture.suggestedSystemInstruction,
    toneParameters: capture.suggestedToneParameters,
    examples: capture.excerpts,
    styleProfile: capture.profile,
  };
}

export function StyleCapture({ personas }: { personas: EditablePersona[] }) {
  const [file, setFile] = useState<File | null>(null);
  const { result, isAnalyzing, error, analyze } = useStyleCapture();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (file) void analyze(file);
  }

  return (
    <div className="flex flex-col gap-8">
      <form className="flex max-w-3xl flex-col gap-3" onSubmit={handleSubmit}>
        <FormField
          label="Documento de referência"
          htmlFor="reference"
          hint={`PDF com texto selecionável ou DOCX, até ${MAX_UPLOAD_MEBIBYTES} MB. O arquivo não é guardado; só o perfil e os trechos que você salvar.`}
        >
          <Input
            id="reference"
            type="file"
            accept={DOCUMENT_ACCEPT}
            disabled={isAnalyzing}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </FormField>
        <Button type="submit" size="lg" className="self-start" disabled={!file || isAnalyzing}>
          {isAnalyzing ? "Analisando o estilo… pode levar até alguns minutos" : "Analisar estilo"}
        </Button>
        {error && (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </form>

      {result && (
        <div className="flex flex-col gap-6" key={`${result.fileName}-${result.suggestedName}`}>
          <StyleProfileCard profile={result.profile} />
          {result.discardedExcerpts > 0 && (
            <p className="text-sm text-muted-foreground">
              {result.discardedExcerpts} trecho(s) sugerido(s) pela IA foram descartados por não aparecerem
              literalmente no documento.
            </p>
          )}
          {personas.length > 0 && <ApplyStyleToPersona personas={personas} capture={result} />}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">Ou crie uma nova persona com este estilo</h2>
            <PersonaEditor initialValues={toPersonaDraft(result)} />
          </section>
        </div>
      )}
    </div>
  );
}
