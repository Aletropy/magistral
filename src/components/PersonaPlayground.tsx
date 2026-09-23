"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent } from "react";
import { EditableList } from "@/components/EditableList";
import { ForbiddenTermsWarning } from "@/components/ForbiddenTermsWarning";
import { MinutaPreview } from "@/components/MinutaPreview";
import { RedlineViewer } from "@/components/RedlineViewer";
import { StyleSlidersField } from "@/components/StyleSlidersField";
import { TagInput } from "@/components/TagInput";
import { TemperatureField } from "@/components/TemperatureField";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { usePersonaMutations } from "@/hooks/usePersonaMutations";
import { usePlaygroundRun } from "@/hooks/usePlaygroundRun";
import { parseMarkdown } from "@/lib/markdown/parseMarkdown";
import { personaEditPath } from "@/lib/personas/paths";
import {
  MAX_NEGATIVE_CONSTRAINTS,
  MAX_NEGATIVE_CONSTRAINT_CHARS,
  MAX_SYSTEM_INSTRUCTION_CHARS,
  MAX_TONE_PARAMETERS,
  MAX_TONE_PARAMETER_CHARS,
  type PersonaInput,
} from "@/lib/personas/schema";
import {
  DEFAULT_SAMPLE_TEXT,
  MAX_SAMPLE_TEXT_CHARS,
  playgroundRequestSchema,
  type PlaygroundDraft,
} from "@/lib/playground/schema";

const SAMPLE_ROWS = 18;
const SYSTEM_INSTRUCTION_ROWS = 5;
const SAVED_NOTICE = "Ajustes salvos na persona.";

interface PersonaPlaygroundProps {
  personaId: string;
  persona: PersonaInput;
}

function toDraft(persona: PersonaInput): PlaygroundDraft {
  const { systemInstruction, toneParameters, temperature, negativeConstraints, styleSliders } = persona;
  return { systemInstruction, toneParameters, temperature, negativeConstraints, styleSliders };
}

export function PersonaPlayground({ personaId, persona }: PersonaPlaygroundProps) {
  const [draft, setDraft] = useState<PlaygroundDraft>(() => toDraft(persona));
  const [sampleText, setSampleText] = useState(DEFAULT_SAMPLE_TEXT);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const { result, isRunning, error, setError, run } = usePlaygroundRun();
  const { isPending: isSaving, error: saveError, save } = usePersonaMutations();
  const blocks = useMemo(() => (result ? parseMarkdown(result.markdown) : []), [result]);
  const isBusy = isRunning || isSaving;

  function update<K extends keyof PlaygroundDraft>(field: K, value: PlaygroundDraft[K]) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setSavedNotice(null);
  }

  function handleRun() {
    const parsed = playgroundRequestSchema.safeParse({ personaId, draft, sampleText });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    void run(parsed.data);
  }

  async function handleSave() {
    setSavedNotice(null);
    if (await save({ ...persona, ...draft }, personaId)) setSavedNotice(SAVED_NOTICE);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !isBusy) {
      event.preventDefault();
      handleRun();
    }
  }

  return (
    <div className="flex flex-col gap-6" onKeyDown={handleKeyDown}>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" disabled={isBusy} onClick={handleRun}>
          {isRunning ? (
            "Reescrevendo…"
          ) : (
            <>
              Testar<span className="hidden md:inline"> (Ctrl+Enter)</span>
            </>
          )}
        </Button>
        <Button size="lg" variant="outline" disabled={isBusy} onClick={handleSave}>
          {isSaving ? "Salvando…" : "Salvar na persona"}
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link href={personaEditPath(personaId)}>Editar exemplos e descrição</Link>
        </Button>
        {savedNotice && <span className="text-sm text-muted-foreground">{savedNotice}</span>}
        {saveError && <span className="text-sm text-destructive">{saveError}</span>}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[20rem_minmax(0,1fr)_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6 rounded-lg border bg-card p-4">
          <StyleSlidersField
            value={draft.styleSliders}
            disabled={isSaving}
            onChange={(styleSliders) => update("styleSliders", styleSliders)}
          />
          <TemperatureField
            value={draft.temperature}
            disabled={isSaving}
            onChange={(temperature) => update("temperature", temperature)}
          />
          <FormField
            label="Palavras e expressões proibidas"
            htmlFor="negativeConstraints"
            hint="Enter ou vírgula para adicionar."
          >
            <TagInput
              id="negativeConstraints"
              tags={draft.negativeConstraints}
              maxTags={MAX_NEGATIVE_CONSTRAINTS}
              maxTagChars={MAX_NEGATIVE_CONSTRAINT_CHARS}
              placeholder="Ex.: outrossim"
              disabled={isSaving}
              onChange={(negativeConstraints) => update("negativeConstraints", negativeConstraints)}
            />
          </FormField>
          <details className="flex flex-col gap-4">
            <summary className="cursor-pointer text-sm font-medium">Instrução e regras de tom</summary>
            <div className="mt-4 flex flex-col gap-4">
              <FormField label="Instrução de sistema" htmlFor="systemInstruction">
                <Textarea
                  id="systemInstruction"
                  rows={SYSTEM_INSTRUCTION_ROWS}
                  maxLength={MAX_SYSTEM_INSTRUCTION_CHARS}
                  disabled={isSaving}
                  value={draft.systemInstruction}
                  onChange={(event) => update("systemInstruction", event.target.value)}
                />
              </FormField>
              <EditableList
                legend="Parâmetros de tom"
                hint="Uma regra por item."
                items={draft.toneParameters}
                maxItems={MAX_TONE_PARAMETERS}
                addLabel="+ Adicionar regra"
                errors={{}}
                errorPath="toneParameters"
                disabled={isSaving}
                onChange={(toneParameters) => update("toneParameters", toneParameters)}
                renderItem={({ id, value, onChange }) => (
                  <Textarea
                    id={id}
                    rows={1}
                    className="min-h-9"
                    maxLength={MAX_TONE_PARAMETER_CHARS}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                  />
                )}
              />
            </div>
          </details>
        </aside>

        <section className="flex flex-col gap-2">
          <FormField
            label="Texto de amostra"
            htmlFor="sampleText"
            hint={`${sampleText.length}/${MAX_SAMPLE_TEXT_CHARS} caracteres.`}
          >
            <Textarea
              id="sampleText"
              rows={SAMPLE_ROWS}
              maxLength={MAX_SAMPLE_TEXT_CHARS}
              className="font-serif"
              value={sampleText}
              onChange={(event) => setSampleText(event.target.value)}
            />
          </FormField>
        </section>

        <section className="flex flex-col gap-2" aria-live="polite" aria-busy={isRunning}>
          <span className="text-sm font-medium">Reescrito pela persona</span>
          {error && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {isRunning ? (
            <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
              <span className="animate-pulse">Reescrevendo o texto com os ajustes atuais…</span>
            </div>
          ) : result ? (
            <>
              <ForbiddenTermsWarning terms={result.forbiddenTermsFound} />
              <Tabs defaultValue="rewritten">
                <TabsList>
                  <TabsTrigger value="rewritten">Texto</TabsTrigger>
                  <TabsTrigger value="diff">Diferenças</TabsTrigger>
                </TabsList>
                <TabsContent value="rewritten">
                  <MinutaPreview blocks={blocks} />
                </TabsContent>
                <TabsContent value="diff">
                  <RedlineViewer original={result.sampleText} revised={result.markdown} />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Ajuste os controles e clique em “Testar” para ver o texto reescrito aqui.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
