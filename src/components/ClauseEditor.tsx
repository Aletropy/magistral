"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useClauseMutations } from "@/hooks/useClauseMutations";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { CLAUSES_PATH } from "@/lib/clauses/paths";
import {
  MAX_CLAUSE_BODY_CHARS,
  MAX_CLAUSE_CATEGORY_CHARS,
  MAX_CLAUSE_TITLE_CHARS,
  clauseInputSchema,
  type ClauseFormValues,
} from "@/lib/clauses/schema";
import { DOCUMENT_TYPE_IDS, DOCUMENT_TYPE_LABELS, OTHER_DOCUMENT_TYPE_ID } from "@/lib/minuta/documentTypes";
import { collectFieldErrors } from "@/lib/validation/collectFieldErrors";

const BODY_ROWS = 10;
/** "Outro" always sees every clause, so it is not offered as a filter. */
const FILTERABLE_DOCUMENT_TYPES = DOCUMENT_TYPE_IDS.filter((id) => id !== OTHER_DOCUMENT_TYPE_ID);

interface ClauseEditorProps {
  clauseId?: string;
  initialValues: ClauseFormValues;
}

export function ClauseEditor({ clauseId, initialValues }: ClauseEditorProps) {
  const router = useRouter();
  const { isPending, error, save } = useClauseMutations();
  const [values, setValues] = useState<ClauseFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);
  useUnsavedChangesWarning(!isSaved && JSON.stringify(values) !== JSON.stringify(initialValues));

  function update<K extends keyof ClauseFormValues>(field: K, value: ClauseFormValues[K]) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function toggleDocumentType(id: (typeof DOCUMENT_TYPE_IDS)[number], checked: boolean) {
    update("documentTypes", checked ? [...values.documentTypes, id] : values.documentTypes.filter((type) => type !== id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = clauseInputSchema.safeParse(values);
    if (!result.success) {
      setErrors(collectFieldErrors(result.error));
      return;
    }
    setErrors({});
    if (await save(result.data, clauseId)) {
      setIsSaved(true);
      router.push(CLAUSES_PATH);
      router.refresh();
    }
  }

  return (
    <form className="flex max-w-3xl flex-col gap-6" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_16rem]">
        <FormField label="Título" htmlFor="title" error={errors.title}>
          <Input
            id="title"
            maxLength={MAX_CLAUSE_TITLE_CHARS}
            placeholder="Ex.: Multa por atraso no pagamento"
            disabled={isPending}
            value={values.title}
            aria-invalid={Boolean(errors.title)}
            onChange={(event) => update("title", event.target.value)}
          />
        </FormField>
        <FormField label="Categoria (opcional)" htmlFor="category" error={errors.category}>
          <Input
            id="category"
            maxLength={MAX_CLAUSE_CATEGORY_CHARS}
            placeholder="Ex.: Penalidades"
            disabled={isPending}
            value={values.category}
            onChange={(event) => update("category", event.target.value)}
          />
        </FormField>
      </div>

      <fieldset className="flex flex-col gap-2" disabled={isPending}>
        <legend className="mb-1 text-sm font-medium">Tipos de documento</legend>
        <p className="-mt-1 text-xs text-muted-foreground">
          Onde a cláusula é oferecida. Sem marcação, ela vale para todos os tipos.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {FILTERABLE_DOCUMENT_TYPES.map((id) => (
            <label key={id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary"
                checked={values.documentTypes.includes(id)}
                onChange={(event) => toggleDocumentType(id, event.target.checked)}
              />
              {DOCUMENT_TYPE_LABELS[id]}
            </label>
          ))}
        </div>
      </fieldset>

      <FormField
        label="Texto aprovado"
        htmlFor="body"
        error={errors.body}
        hint={`${values.body.length}/${MAX_CLAUSE_BODY_CHARS} caracteres. Markdown: **negrito**, listas numeradas para incisos. A IA ajusta o tom, mas mantém obrigações, valores e prazos.`}
      >
        <Textarea
          id="body"
          rows={BODY_ROWS}
          maxLength={MAX_CLAUSE_BODY_CHARS}
          className="font-mono text-xs"
          disabled={isPending}
          value={values.body}
          aria-invalid={Boolean(errors.body)}
          onChange={(event) => update("body", event.target.value)}
        />
      </FormField>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar cláusula"}
        </Button>
        <Button type="button" size="lg" variant="outline" disabled={isPending} onClick={() => router.push(CLAUSES_PATH)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
