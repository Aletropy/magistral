import type { Metadata } from "next";
import { ClauseEditor } from "@/components/ClauseEditor";
import { Page } from "@/components/layout/Page";
import { EMPTY_CLAUSE } from "@/lib/clauses/schema";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Nova cláusula" };

export default async function NewClausePage() {
  await requireUser();
  return (
    <Page
      title="Nova cláusula"
      width="default"
    >
      <ClauseEditor initialValues={EMPTY_CLAUSE} />
    </Page>
  );
}
