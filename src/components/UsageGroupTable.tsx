import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInteger, formatLatency, formatUsd } from "@/lib/usage/format";
import type { UsageGroup } from "@/lib/usage/types";

interface UsageGroupTableProps {
  title: string;
  keyHeader: string;
  groups: UsageGroup[];
  formatKey: (key: string) => string;
}

export function UsageGroupTable({ title, keyHeader, groups, formatKey }: UsageGroupTableProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{keyHeader}</TableHead>
              <TableHead className="text-right">Chamadas</TableHead>
              <TableHead className="text-right">Falhas</TableHead>
              <TableHead className="text-right">Tokens de entrada</TableHead>
              <TableHead className="text-right">Tokens de saída</TableHead>
              <TableHead className="text-right">Latência média</TableHead>
              <TableHead className="text-right">Custo estimado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma chamada no período.
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.key}>
                  <TableCell className="font-medium">{formatKey(group.key)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInteger(group.calls)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInteger(group.failedCalls)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInteger(group.inputTokens)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInteger(group.outputTokens)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatLatency(group.averageLatencyMs)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUsd(group.costUsd)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
