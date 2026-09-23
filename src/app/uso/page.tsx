import type { Metadata } from "next";
import { connection } from "next/server";
import { RecentCallsTable } from "@/components/RecentCallsTable";
import { StatTile } from "@/components/StatTile";
import { UsageGroupTable } from "@/components/UsageGroupTable";
import { formatDay, formatInteger, formatLatency, formatUsd } from "@/lib/usage/format";
import { getUsageRepository } from "@/lib/usage/getUsageRepository";
import { LLM_OPERATIONS, LLM_OPERATION_LABELS, type LlmOperation } from "@/lib/usage/types";

export const metadata: Metadata = { title: "Uso e custos" };

const USAGE_WINDOW_DAYS = 30;
const RECENT_CALLS_LIMIT = 25;

function formatOperation(key: string): string {
  return (LLM_OPERATIONS as readonly string[]).includes(key)
    ? LLM_OPERATION_LABELS[key as LlmOperation]
    : key;
}

export default async function UsagePage() {
  await connection();
  const usage = getUsageRepository();
  const totals = usage.totals(USAGE_WINDOW_DAYS);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Uso e custos</h1>
        <p className="max-w-2xl text-muted-foreground">
          Cada chamada à IA nos últimos {USAGE_WINDOW_DAYS} dias: tokens, latência e custo estimado
          pelo preço de tabela de cada modelo. Tokens de raciocínio contam como saída.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Custo estimado" value={formatUsd(totals.costUsd)} />
        <StatTile label="Chamadas" value={formatInteger(totals.calls)} />
        <StatTile label="Falhas" value={formatInteger(totals.failedCalls)} />
        <StatTile
          label="Tokens"
          value={formatInteger(totals.inputTokens + totals.outputTokens)}
          detail={`${formatInteger(totals.inputTokens)} entrada · ${formatInteger(totals.outputTokens)} saída`}
        />
        <StatTile label="Latência média" value={formatLatency(totals.averageLatencyMs)} />
      </div>

      <UsageGroupTable
        title="Por dia"
        keyHeader="Dia"
        groups={usage.groupedTotals("day", USAGE_WINDOW_DAYS)}
        formatKey={formatDay}
      />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <UsageGroupTable
          title="Por operação"
          keyHeader="Operação"
          groups={usage.groupedTotals("operation", USAGE_WINDOW_DAYS)}
          formatKey={formatOperation}
        />
        <UsageGroupTable
          title="Por modelo"
          keyHeader="Modelo"
          groups={usage.groupedTotals("model", USAGE_WINDOW_DAYS)}
          formatKey={(key) => key}
        />
      </div>
      <RecentCallsTable calls={usage.recent(RECENT_CALLS_LIMIT)} />
    </main>
  );
}
