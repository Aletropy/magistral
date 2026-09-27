"use client";

import { useState, type FormEvent } from "react";
import { PASSWORDS_DIFFER_MESSAGE, PasswordFields } from "@/components/auth/PasswordFields";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { useJsonSubmit } from "@/hooks/useJsonSubmit";
import { MAX_DISPLAY_NAME_CHARS, MAX_USERNAME_CHARS, setupSchema, type SetupInput } from "@/lib/auth/schema";
import { SETUP_ENDPOINT } from "@/lib/http/endpoints";
import { HOME_PATH } from "@/lib/minutas/paths";
import { collectFieldErrors } from "@/lib/validation/collectFieldErrors";

const SETUP_FAILED = "Não foi possível concluir a configuração. Tente novamente.";
const EMPTY: SetupInput = { setupToken: "", displayName: "", username: "", password: "" };

/** Creates the office's first admin with the code from the server log, then opens the app signed in. */
export function SetupForm() {
  const { isPending, error, submit } = useJsonSubmit();
  const [values, setValues] = useState(EMPTY);
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(field: keyof SetupInput, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = setupSchema.safeParse(values);
    const fieldErrors = result.success ? {} : collectFieldErrors(result.error);
    if (values.password !== confirmation) fieldErrors.password ??= PASSWORDS_DIFFER_MESSAGE;
    setErrors(fieldErrors);
    if (!result.success || Object.keys(fieldErrors).length > 0) return;
    if (await submit("POST", SETUP_ENDPOINT, result.data, SETUP_FAILED)) window.location.assign(HOME_PATH);
  }

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
      <FormField
        label="Código de configuração"
        htmlFor="setupToken"
        hint="Está no terminal onde o servidor foi iniciado."
        error={errors.setupToken}
      >
        <Input
          id="setupToken"
          autoComplete="off"
          autoCapitalize="none"
          value={values.setupToken}
          disabled={isPending}
          aria-invalid={Boolean(errors.setupToken)}
          onChange={(event) => update("setupToken", event.target.value)}
        />
      </FormField>
      <FormField label="Seu nome" htmlFor="displayName" error={errors.displayName}>
        <Input
          id="displayName"
          autoComplete="name"
          maxLength={MAX_DISPLAY_NAME_CHARS}
          value={values.displayName}
          disabled={isPending}
          aria-invalid={Boolean(errors.displayName)}
          onChange={(event) => update("displayName", event.target.value)}
        />
      </FormField>
      <FormField label="Nome de acesso" htmlFor="username" hint="Ex.: ana.souza" error={errors.username}>
        <Input
          id="username"
          autoComplete="username"
          autoCapitalize="none"
          maxLength={MAX_USERNAME_CHARS}
          value={values.username}
          disabled={isPending}
          aria-invalid={Boolean(errors.username)}
          onChange={(event) => update("username", event.target.value)}
        />
      </FormField>
      <PasswordFields
        idPrefix="setup"
        password={values.password}
        confirmation={confirmation}
        onPasswordChange={(value) => update("password", value)}
        onConfirmationChange={setConfirmation}
        error={errors.password}
        disabled={isPending}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Criando…" : "Criar administrador e entrar"}
      </Button>
    </form>
  );
}
