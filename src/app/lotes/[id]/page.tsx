import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BatchProgress } from "@/components/BatchProgress";
import { Page } from "@/components/layout/Page";
import { requireUser } from "@/lib/auth/dal";
import { getBatchRepository } from "@/lib/batch/getBatchRepository";

export async function generateMetadata({ params }: PageProps<"/lotes/[id]">): Promise<Metadata> {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const item = getBatchRepository().getJob(id, user.id);
  return { title: item?.name ?? "Lote" };
}

export default async function BatchPage({ params }: PageProps<"/lotes/[id]">) {
  await connection();
  const user = await requireUser();
  const job = getBatchRepository().getJob((await params).id, user.id);
  if (!job) notFound();

  return (
    <Page
      title={<>{job.name}</>}
      width="wide"
    >
      <BatchProgress initialJob={job} />
    </Page>
  );
}
