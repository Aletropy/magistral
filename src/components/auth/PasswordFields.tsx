"use client";

import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { MAX_PASSWORD_CHARS, MIN_PASSWORD_CHARS } from "@/lib/auth/schema";

export const PASSWORDS_DIFFER_MESSAGE = "As senhas não conferem.";

interface PasswordFieldsProps {
  idPrefix: string;
  password: string;
  confirmation: string;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  error?: string;
  disabled: boolean;
}

/** A new password typed twice, with the length rule as a hint. */
export function PasswordFields({
  idPrefix,
  password,
  confirmation,
  onPasswordChange,
  onConfirmationChange,
  error,
  disabled,
}: PasswordFieldsProps) {
  return (
    <>
      <FormField
        label="Nova senha"
        htmlFor={`${idPrefix}-password`}
        hint={`Ao menos ${MIN_PASSWORD_CHARS} caracteres. Uma frase fácil de lembrar funciona bem.`}
        error={error}
      >
        <Input
          id={`${idPrefix}-password`}
          type="password"
          autoComplete="new-password"
          maxLength={MAX_PASSWORD_CHARS}
          value={password}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
      </FormField>
      <FormField label="Repita a nova senha" htmlFor={`${idPrefix}-confirmation`}>
        <Input
          id={`${idPrefix}-confirmation`}
          type="password"
          autoComplete="new-password"
          maxLength={MAX_PASSWORD_CHARS}
          value={confirmation}
          disabled={disabled}
          onChange={(event) => onConfirmationChange(event.target.value)}
        />
      </FormField>
    </>
  );
}
