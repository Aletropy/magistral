"use client";

import { useState, type FormEvent } from "react";
import { PASSWORDS_DIFFER_MESSAGE, PasswordFields } from "@/components/auth/PasswordFields";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { useJsonSubmit } from "@/hooks/useJsonSubmit";
import { MAX_PASSWORD_CHARS, passwordChangeSchema } from "@/lib/auth/schema";
import { PASSWORD_ENDPOINT } from "@/lib/http/endpoints";
import { collectFieldErrors } from "@/lib/validation/collectFieldErrors";

const CHANGE_FAILED = "Não foi possível trocar a senha. Tente novamente.";

/** Changes the signed-in user's password; other browsers where they were signed in are signed out. */
export function PasswordChangeForm() {
  const { isPending, error, submit } = useJsonSubmit();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const result = passwordChangeSchema.safeParse({ currentPassword, newPassword });
    const fieldErrors = result.success ? {} : collectFieldErrors(result.error);
    if (newPassword !== confirmation) fieldErrors.newPassword ??= PASSWORDS_DIFFER_MESSAGE;
    setErrors(fieldErrors);
    if (!result.success || Object.keys(fieldErrors).length > 0) return;
    if (await submit("POST", PASSWORD_ENDPOINT, result.data, CHANGE_FAILED)) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setSaved(true);
    }
  }

  return (
    <form className="flex max-w-md flex-col gap-4" noValidate onSubmit={handleSubmit}>
      <FormField label="Senha atual" htmlFor="current-password" error={errors.currentPassword}>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          maxLength={MAX_PASSWORD_CHARS}
          value={currentPassword}
          disabled={isPending}
          aria-invalid={Boolean(errors.currentPassword)}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </FormField>
      <PasswordFields
        idPrefix="account"
        password={newPassword}
        confirmation={confirmation}
        onPasswordChange={setNewPassword}
        onConfirmationChange={setConfirmation}
        error={errors.newPassword}
        disabled={isPending}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-primary">
          Senha alterada. As sessões em outros navegadores foram encerradas.
        </p>
      )}
      <Button type="submit" className="self-start" disabled={isPending}>
        {isPending ? "Salvando…" : "Trocar senha"}
      </Button>
    </form>
  );
}
