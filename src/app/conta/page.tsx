import type { Metadata } from "next";
import { connection } from "next/server";
import { PasswordChangeForm } from "@/components/auth/PasswordChangeForm";
import { Page } from "@/components/layout/Page";
import { requireUser } from "@/lib/auth/dal";
import { USER_ROLE_LABELS } from "@/lib/auth/types";

export const metadata: Metadata = { title: "Minha conta" };

export default async function AccountPage() {
  await connection();
  const user = await requireUser();

  return (
    <Page
      title="Minha conta"
      width="narrow"
      description={
        <>
          {user.displayName} · {user.username} · {USER_ROLE_LABELS[user.role]}
        </>
      }
    >
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Trocar senha</h2>
        <PasswordChangeForm />
      </section>
    </Page>
  );
}
