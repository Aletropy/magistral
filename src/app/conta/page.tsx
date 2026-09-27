import type { Metadata } from "next";
import { connection } from "next/server";
import { PasswordChangeForm } from "@/components/auth/PasswordChangeForm";
import { requireUser } from "@/lib/auth/dal";
import { USER_ROLE_LABELS } from "@/lib/auth/types";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  await connection();
  const user = await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Minha conta</h1>
        <p className="text-muted-foreground">
          {user.displayName} · {user.username} · {USER_ROLE_LABELS[user.role]}
        </p>
      </header>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Trocar senha</h2>
        <PasswordChangeForm />
      </section>
    </main>
  );
}
