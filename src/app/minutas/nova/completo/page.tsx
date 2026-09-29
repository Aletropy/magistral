import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Page } from "@/components/layout/Page";
import { MinutaStudio } from "@/components/MinutaStudio";
import { requireUser } from "@/lib/auth/dal";
import { loadMinutaFormOptions } from "@/lib/minuta/loadMinutaFormOptions";
import { loadStudioState } from "@/lib/minuta/loadStudioState";
import { minutaPath } from "@/lib/minutas/paths";

export const metadata: Metadata = { title: "Nova minuta — todos os campos" };

/** The advanced mode: every field on one page, sharing the unsent draft with the wizard. */
export default async function NewMinutaAdvancedPage({ searchParams }: PageProps<"/minutas/nova/completo">) {
  await connection();
  const user = await requireUser();
  const state = loadStudioState(await searchParams, user.id);
  if (state.kind === "finished") redirect(minutaPath(state.minutaId));

  return (
    <Page
      title="Nova minuta"
      width="wide"
      description="Todos os campos numa página, para quem já sabe o que pedir. O rascunho é o mesmo do passo a passo."
    >
      <MinutaStudio
        userId={user.id}
        layout="all"
        {...loadMinutaFormOptions()}
        initialTask={state.initialTask}
        initialSuggestion={state.initialSuggestion}
      />
    </Page>
  );
}
