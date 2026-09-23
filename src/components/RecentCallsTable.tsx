import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LLM_CALL_STATUS_LABELS,
  formatDateTime,
  formatInteger,
  formatLatency,
  formatUsd,
} from "@/lib/usage/format";
import { LLM_OPERATION_LABELS, type LlmCall } from "@/lib/usage/types";

export function RecentCallsTable({ calls }: { calls: LlmCall[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Chamadas recentes</h2>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Operação</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead className="text-right">Entrada</TableHead>
              <TableHead className="text-right">Saída</TableHead>
              <TableHead className="text-right">Raciocínio</TableHead>
              <TableHead className="text-right">Latência</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Nenhuma chamada registrada ainda.
                </TableCell>
              </TableRow>
            ) : (
              calls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell className="tabular-nums">{formatDateTime(call.createdAt)}</TableCell>
                  <TableCell>{LLM_OPERATION_LABELS[call.operation]}</TableCell>
                  <TableCell className="font-mono text-xs">{call.model}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInteger(call.inputTokens)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInteger(call.outputTokens)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInteger(call.thinkingTokens)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatLatency(call.latencyMs)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(call.estimatedCostUsd)}</TableCell>
                  <TableCell>
                    <Badge variant={call.status === "ok" ? "secondary" : "destructive"}>
                      {LLM_CALL_STATUS_LABELS[call.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
