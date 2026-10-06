import { CircleCheck, Plug } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { JurisprudenciasConnection } from "@/components/integrations/JurisprudenciasConnection";
import { Page } from "@/components/layout/Page";
import { Badge } from "@/components/ui/badge";
import { WarningCallout } from "@/components/ui/WarningCallout";
import { requireAdmin } from "@/lib/auth/dal";
import { requireSystemUnlock } from "@/lib/systemPin";
import { AppError } from "@/lib/errors/AppError";
import { startOfBrasiliaDay } from "@/lib/integrations/jurisprudencias/brasiliaDay";
import {
  JURISPRUDENCIAS_DAILY_LIMITS,
  JURISPRUDENCIAS_NAME,
  JURISPRUDENCIAS_PROVIDER,
  JURISPRUDENCIAS_SITE_URL,
  JURISPRUDENCIAS_TOOLS,
  usageModelOf,
} from "@/lib/integrations/jurisprudencias/config";
import { connectionStatus, type ConnectionStatus } from "@/lib/integrations/jurisprudencias/connection";
import { CONNECTION_RESULTS, CONNECTION_RESULT_PARAM } from "@/lib/integrations/paths";
import { plural } from "@/lib/text/plural";
import { getUsageRepository } from "@/lib/usage/getUsageRepository";
import { formatDateTime } from "@/lib/usage/format";

export const metadata: Metadata = { title: "Integrações" };

const { free, subscriber } = JURISPRUDENCIAS_DAILY_LIMITS;

/** The status, or why integrations can't work on this server (e.g. no MAGISTRAL_SECRET_KEY). */
function readStatus(): { status: ConnectionStatus | null; configurationError: string | null } {
  try {
    return { status: connectionStatus(), configurationError: null };
  } catch (error) {
    if (error instanceof AppError) return { status: null, configurationError: error.message };
    throw error;
  }
}

export default async function IntegrationsPage({ searchParams }: PageProps<"/integracoes">) {
  await connection();
  await requireAdmin();
  await requireSystemUnlock();
  const result = (await searchParams)[CONNECTION_RESULT_PARAM];
  const { status, configurationError } = readStatus();
  const usage = getUsageRepository();
  const since = startOfBrasiliaDay(new Date());
  const count = (tool: string) => usage.countCallsSince(JURISPRUDENCIAS_PROVIDER, since, usageModelOf(tool));
  const searches = count(JURISPRUDENCIAS_TOOLS.search);
  const lookups = count(JURISPRUDENCIAS_TOOLS.lookup);

  return (
    <Page title="Integrações" description="Serviços externos que o Advogado IA pode consultar em nome do escritório.">
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
              <Plug className="size-5" />
            </span>
            <div className="flex flex-col">
              <h2 className="font-semibold">{JURISPRUDENCIAS_NAME}</h2>
              <p className="text-sm text-muted-foreground">Pesquisa de decisões do STF, STJ, TST, TRFs, TRTs, TJs e CARF.</p>
            </div>
          </div>
          {status && <Badge variant={status.connected ? "default" : "outline"}>{status.connected ? "Conectada" : "Não conectada"}</Badge>}
        </div>

        <p className="text-sm">
          Com a conta do escritório conectada, o Advogado IA pesquisa jurisprudência quando a conversa pede e usa
          as decisões para fundamentar a resposta, sem mostrar fontes. A conexão vale para toda a equipe; só
          administradores a gerenciam.
        </p>

        {result === CONNECTION_RESULTS.connected && status?.connected && (
          <p className="flex items-center gap-2 text-sm text-primary" role="status">
            <CircleCheck className="size-4" aria-hidden /> Conta conectada.
          </p>
        )}
        {configurationError && <WarningCallout>{configurationError}</WarningCallout>}
        {status?.lastError && <WarningCallout>{status.lastError}</WarningCallout>}

        {status?.connected && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">Conectada por</dt>
            <dd>{status.connectedByName ?? "Conta removida"}</dd>
            <dt className="text-muted-foreground">Desde</dt>
            <dd>{status.connectedAt ? formatDateTime(status.connectedAt) : "—"}</dd>
            <dt className="text-muted-foreground">Uso hoje</dt>
            <dd>
              {plural(searches, "busca", "buscas")} e {plural(lookups, "consulta de processo", "consultas de processo")}
            </dd>
          </dl>
        )}

        {status && <JurisprudenciasConnection connected={status.connected} />}

        <div className="flex flex-col gap-1 border-t pt-3 text-xs text-muted-foreground">
          <p>
            Limites por dia, renovados à meia-noite de Brasília e somados ao uso da conta no próprio site: plano gratuito,{" "}
            {free.searches} buscas e {free.lookups} consultas de processo; assinatura, {subscriber.searches} buscas e{" "}
            {subscriber.lookups.toLocaleString("pt-BR")} consultas. Para uso real, assine em{" "}
            <a href={JURISPRUDENCIAS_SITE_URL} target="_blank" rel="noreferrer" className="text-primary hover:underline">
              jurisprudencias.ai
            </a>
            .
          </p>
          <p>
            O que é enviado: só os termos de pesquisa, o tribunal e números de processo escolhidos pelo Advogado IA. O
            texto das minutas não é enviado.
          </p>
        </div>
      </section>
    </Page>
  );
}
