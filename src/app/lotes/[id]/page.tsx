import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BatchProgress } from "@/components/BatchProgress";
import { getBatchRepository } from "@/lib/batch/getBatchRepository";

export default async function BatchPage({ params }: PageProps<"/lotes/[id]">) {
  await connection();
  const job = getBatchRepository().getJob((await params).id);
  if (!job) notFound();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight">{job.name}</h1>
      <BatchProgress initialJob={job} />
    </main>
  );
}
