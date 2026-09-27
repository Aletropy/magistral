import type { Metadata } from "next";
import { ClauseEditor } from "@/components/ClauseEditor";
import { EMPTY_CLAUSE } from "@/lib/clauses/schema";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Nova cláusula" };

export default async function NewClausePage() {
  await requireUser();
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Nova cláusula</h1>
      <ClauseEditor initialValues={EMPTY_CLAUSE} />
    </main>
  );
}
