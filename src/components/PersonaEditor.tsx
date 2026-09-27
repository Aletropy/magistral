"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { EditableList } from "@/components/EditableList";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { StyleProfileCard } from "@/components/StyleProfileCard";
import { StyleSlidersField } from "@/components/StyleSlidersField";
import { TagInput } from "@/components/TagInput";
import { TemperatureField } from "@/components/TemperatureField";
import { Textarea } from "@/components/ui/textarea";
import { usePersonaMutations } from "@/hooks/usePersonaMutations";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { PERSONAS_PATH } from "@/lib/personas/paths";
import {
  MAX_EXAMPLES,
  MAX_EXAMPLE_CHARS,
  MAX_NEGATIVE_CONSTRAINTS,
  MAX_NEGATIVE_CONSTRAINT_CHARS,
  MAX_PERSONA_DESCRIPTION_CHARS,
  MAX_PERSONA_NAME_CHARS,
  MAX_SYSTEM_INSTRUCTION_CHARS,
  MAX_TONE_PARAMETERS,
  MAX_TONE_PARAMETER_CHARS,
  personaInputSchema,
  type PersonaFormValues,
} from "@/lib/personas/schema";
import { collectFieldErrors } from "@/lib/validation/collectFieldErrors";

const DESCRIPTION_ROWS = 2;
const SYSTEM_INSTRUCTION_ROWS = 4;
const EXAMPLE_ROWS = 6;

interface PersonaEditorProps {
  /** Omitted when creating a new persona. */
  personaId?: string;
  initialValues: PersonaFormValues;
}

export function PersonaEditor({ personaId, initialValues }: PersonaEditorProps) {
  const router = useRouter();
  const { isPending, error, save } = usePersonaMutations();
  const [values, setValues] = useState<PersonaFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);
  useUnsavedChangesWarning(!isSaved && JSON.stringify(values) !== JSON.stringify(initialValues));

  function update<K extends keyof PersonaFormValues>(field: K, value: PersonaFormValues[K]) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = personaInputSchema.safeParse(values);
    if (!result.success) {
      setErrors(collectFieldErrors(result.error));
      return;
    }
    setErrors({});
    if (await save(result.data, personaId)) {
      setIsSaved(true);
      router.push(PERSONAS_PATH);
      router.refresh();
    }
  }

  return (
    <form className="flex max-w-3xl flex-col gap-6" noValidate onSubmit={handleSubmit}>
      <FormField label="Nome" htmlFor="name" error={errors.name}>
        <Input
          id="name"
          maxLength={MAX_PERSONA_NAME_CHARS}
          placeholder="Ex.: PGM - Agressivo Tributário"
          disabled={isPending}
          value={values.name}
          aria-invalid={Boolean(errors.name)}
          onChange={(event) => update("name", event.target.value)}
        />
      </FormField>

      <FormField
        label="Descrição (opcional)"
        htmlFor="description"
        error={errors.description}
        hint="Aparece ao escolher a persona no formulário da minuta."
      >
        <Textarea
          id="description"
          rows={DESCRIPTION_ROWS}
          maxLength={MAX_PERSONA_DESCRIPTION_CHARS}
          disabled={isPending}
          value={values.description}
          aria-invalid={Boolean(errors.description)}
          onChange={(event) => update("description", event.target.value)}
        />
      </FormField>

      <FormField
        label="Instrução de sistema"
        htmlFor="systemInstruction"
        error={errors.systemInstruction}
        hint="Quem a IA deve ser e como escreve. É a primeira coisa que ela lê."
      >
        <Textarea
          id="systemInstruction"
          rows={SYSTEM_INSTRUCTION_ROWS}
          maxLength={MAX_SYSTEM_INSTRUCTION_CHARS}
          disabled={isPending}
          placeholder="Ex.: Você é procurador municipal especializado em execução fiscal…"
          value={values.systemInstruction}
          aria-invalid={Boolean(errors.systemInstruction)}
          onChange={(event) => update("systemInstruction", event.target.value)}
        />
      </FormField>

      <EditableList
        legend="Parâmetros de tom"
        hint="Regras estritas de redação, uma por linha (ex.: “Use voz ativa”, “Limite parágrafos a 3 frases”)."
        items={values.toneParameters}
        maxItems={MAX_TONE_PARAMETERS}
        addLabel="+ Adicionar regra"
        errors={errors}
        errorPath="toneParameters"
        disabled={isPending}
        onChange={(toneParameters) => update("toneParameters", toneParameters)}
        renderItem={({ id, value, invalid, onChange }) => (
          <Textarea
            id={id}
            rows={1}
            className="min-h-9"
            maxLength={MAX_TONE_PARAMETER_CHARS}
            value={value}
            aria-invalid={invalid}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      />

      <FormField
        label="Palavras e expressões proibidas"
        htmlFor="negativeConstraints"
        error={errors.negativeConstraints}
        hint="Digite e tecle Enter ou vírgula. A IA nunca deve usar esses termos (ex.: outrossim, debalde, posto isto)."
      >
        <TagInput
          id="negativeConstraints"
          tags={values.negativeConstraints}
          maxTags={MAX_NEGATIVE_CONSTRAINTS}
          maxTagChars={MAX_NEGATIVE_CONSTRAINT_CHARS}
          placeholder="Ex.: outrossim"
          disabled={isPending}
          invalid={Boolean(errors.negativeConstraints)}
          onChange={(negativeConstraints) => update("negativeConstraints", negativeConstraints)}
        />
      </FormField>

      <StyleSlidersField
        value={values.styleSliders}
        disabled={isPending}
        onChange={(styleSliders) => update("styleSliders", styleSliders)}
      />

      <TemperatureField
        value={values.temperature}
        error={errors.temperature}
        disabled={isPending}
        onChange={(temperature) => update("temperature", temperature)}
      />

      {values.styleProfile && (
        <StyleProfileCard
          profile={values.styleProfile}
          action={
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => update("styleProfile", null)}>
              Remover perfil
            </Button>
          }
        />
      )}

      <EditableList
        legend="Exemplos de estilo"
        hint="Trechos em Markdown que mostram o tom. A IA imita o estilo, não o conteúdo."
        items={values.examples}
        maxItems={MAX_EXAMPLES}
        addLabel="+ Adicionar exemplo"
        errors={errors}
        errorPath="examples"
        disabled={isPending}
        onChange={(examples) => update("examples", examples)}
        renderItem={({ id, value, invalid, onChange }) => (
          <Textarea
            id={id}
            rows={EXAMPLE_ROWS}
            maxLength={MAX_EXAMPLE_CHARS}
            className="font-mono text-xs"
            value={value}
            aria-invalid={invalid}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      />

      {error && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar persona"}
        </Button>
        <Button type="button" size="lg" variant="outline" disabled={isPending} onClick={() => router.push(PERSONAS_PATH)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
