import type { Metadata } from "next";
import { Page } from "@/components/layout/Page";
import { PersonaEditor } from "@/components/PersonaEditor";
import { EMPTY_PERSONA } from "@/lib/personas/schema";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Nova persona" };

export default async function NewPersonaPage() {
  await requireUser();
  return (
    <Page
      title="Nova persona"
      width="default"
    >
      <PersonaEditor initialValues={EMPTY_PERSONA} />
    </Page>
  );
}
