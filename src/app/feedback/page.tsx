import { MessageSquareWarning } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { ResolveFeedbackButton } from "@/components/feedback/ResolveFeedbackButton";
import { EmptyState } from "@/components/layout/EmptyState";
import { Page } from "@/components/layout/Page";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/auth/dal";
import { getFeedbackRepository } from "@/lib/feedback/getFeedbackRepository";
import { formatDateTime } from "@/lib/usage/format";

export const metadata: Metadata = { title: "Feedback" };

/** How many reports the page lists; the oldest resolved ones drop off first. */
const FEEDBACK_LIMIT = 200;

export default async function FeedbackPage() {
  await connection();
  await requireAdmin();
  const repository = getFeedbackRepository();
  const reports = repository.list(FEEDBACK_LIMIT);
  const open = repository.countOpen();

  return (
    <Page
      title="Feedback"
      width="wide"
      description="O que os testadores relataram pelo botão de feedback, com a página em que estavam."
    >
      {reports.length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title="Nenhum relato ainda"
          description="Os relatos enviados pelo botão de feedback, no topo de cada página, aparecem aqui."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{open === 0 ? "Tudo resolvido." : `${open} em aberto.`}</p>
          <ul className="flex flex-col gap-3">
            {reports.map((report) => (
              <li key={report.id} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5 text-sm">
                    <span className="font-medium">{report.author ?? "Conta removida"}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(report.createdAt)} · <code>{report.page || "/"}</code>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.resolvedAt && <Badge variant="secondary">Resolvido</Badge>}
                    <ResolveFeedbackButton id={report.id} resolved={report.resolvedAt !== null} />
                  </div>
                </div>
                <p className="text-sm whitespace-pre-line">{report.message}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Page>
  );
}
