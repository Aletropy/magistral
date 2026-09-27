"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/input";
import { useJsonSubmit } from "@/hooks/useJsonSubmit";
import { MAX_PASSWORD_CHARS, MAX_USERNAME_CHARS } from "@/lib/auth/schema";
import { HOME_PATH } from "@/lib/minutas/paths";
import { LOGIN_ENDPOINT } from "@/lib/http/api";

const LOGIN_FAILED = "Não foi possível entrar. Tente novamente.";

/** Signs in and reloads the app at `nextPath`, so every server component sees the new session. */
export function LoginForm({ nextPath }: { nextPath: string | null }) {
  const { isPending, error, submit } = useJsonSubmit();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await submit("POST", LOGIN_ENDPOINT, { username, password }, LOGIN_FAILED)) {
      window.location.assign(nextPath ?? HOME_PATH);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <FormField label="Nome de acesso" htmlFor="username">
        <Input
          id="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          maxLength={MAX_USERNAME_CHARS}
          value={username}
          disabled={isPending}
          onChange={(event) => setUsername(event.target.value)}
        />
      </FormField>
      <FormField label="Senha" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={MAX_PASSWORD_CHARS}
          value={password}
          disabled={isPending}
          onChange={(event) => setPassword(event.target.value)}
        />
      </FormField>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
