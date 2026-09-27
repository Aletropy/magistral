"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PASSWORDS_DIFFER_MESSAGE, PasswordFields } from "@/components/auth/PasswordFields";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { NATIVE_SELECT_CLASS } from "@/components/ui/nativeSelect";
import { useJsonSubmit } from "@/hooks/useJsonSubmit";
import { MAX_DISPLAY_NAME_CHARS, MAX_USERNAME_CHARS, newUserSchema, type NewUserInput } from "@/lib/auth/schema";
import { USER_ROLES, USER_ROLE_LABELS, type UserRole } from "@/lib/auth/types";
import { USERS_ENDPOINT } from "@/lib/http/endpoints";
import { collectFieldErrors } from "@/lib/validation/collectFieldErrors";

const CREATE_FAILED = "Não foi possível cadastrar a pessoa. Tente novamente.";
const EMPTY: NewUserInput = { displayName: "", username: "", password: "", role: "member" };

/** Adds someone to the office; the admin tells them the initial password, which they can change in Minha conta. */
export function NewUserForm() {
  const router = useRouter();
  const { isPending, error, submit } = useJsonSubmit();
  const [values, setValues] = useState(EMPTY);
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<string | null>(null);

  function update<K extends keyof NewUserInput>(field: K, value: NewUserInput[K]) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreated(null);
    const result = newUserSchema.safeParse(values);
    const fieldErrors = result.success ? {} : collectFieldErrors(result.error);
    if (values.password !== confirmation) fieldErrors.password ??= PASSWORDS_DIFFER_MESSAGE;
    setErrors(fieldErrors);
    if (!result.success || Object.keys(fieldErrors).length > 0) return;
    if (await submit("POST", USERS_ENDPOINT, result.data, CREATE_FAILED)) {
      setCreated(result.data.username);
      setValues(EMPTY);
      setConfirmation("");
      router.refresh();
    }
  }

  return (
    <form className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:p-6" noValidate onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold">Cadastrar pessoa</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Nome" htmlFor="new-user-name" error={errors.displayName}>
          <Input
            id="new-user-name"
            maxLength={MAX_DISPLAY_NAME_CHARS}
            value={values.displayName}
            disabled={isPending}
            aria-invalid={Boolean(errors.displayName)}
            onChange={(event) => update("displayName", event.target.value)}
          />
        </FormField>
        <FormField label="Nome de acesso" htmlFor="new-user-username" hint="Ex.: bruno.lima" error={errors.username}>
          <Input
            id="new-user-username"
            autoCapitalize="none"
            autoComplete="off"
            maxLength={MAX_USERNAME_CHARS}
            value={values.username}
            disabled={isPending}
            aria-invalid={Boolean(errors.username)}
            onChange={(event) => update("username", event.target.value)}
          />
        </FormField>
        <PasswordFields
          idPrefix="new-user"
          password={values.password}
          confirmation={confirmation}
          onPasswordChange={(value) => update("password", value)}
          onConfirmationChange={setConfirmation}
          error={errors.password}
          disabled={isPending}
        />
        <FormField label="Perfil" htmlFor="new-user-role" hint="Administradores cadastram pessoas, veem o uso e removem itens compartilhados.">
          <select
            id="new-user-role"
            className={NATIVE_SELECT_CLASS}
            value={values.role}
            disabled={isPending}
            onChange={(event) => update("role", event.target.value as UserRole)}
          >
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {USER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {created && (
        <p role="status" className="text-sm text-primary">
          {created} cadastrado. Informe a senha inicial pessoalmente; ela pode ser trocada em Minha conta.
        </p>
      )}
      <Button type="submit" className="self-start" disabled={isPending}>
        {isPending ? "Cadastrando…" : "Cadastrar"}
      </Button>
    </form>
  );
}
