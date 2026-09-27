import { FilePlus2, History, Search, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { DeleteMinutaButton } from "@/components/DeleteMinutaButton";
import { EmptyState } from "@/components/layout/EmptyState";
import { Page } from "@/components/layout/Page";
import { Pagination, readPageParam } from "@/components/layout/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NATIVE_SELECT_CLASS } from "@/components/ui/nativeSelect";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/dal";
import { getMinutaRepository } from "@/lib/minutas/getMinutaRepository";
import { HISTORY_PATH, NEW_MINUTA_PATH, minutaPath } from "@/lib/minutas/paths";
import { formatDateTime } from "@/lib/usage/format";

export const metadata: Metadata = { title: "Histórico" };

const PAGE_SIZE = 20;
const ALL_PERSONAS = "";

/** The history's filters, read from the URL so a filtered list can be bookmarked and shared. */
function readFilters(params: Record<string, string | string[] | undefined>) {
  const text = (name: string) => (typeof params[name] === "string" ? (params[name] as string) : "");
  return { query: text("q"), personaName: text("persona"), page: readPageParam(params.pagina) };
}

function historyHref({ query, personaName, page }: { query: string; personaName: string; page: number }): string {
  const search = new URLSearchParams();
  if (query) search.set("q", query);
  if (personaName) search.set("persona", personaName);
  if (page > 1) search.set("pagina", String(page));
  const suffix = search.toString();
  return suffix ? `${HISTORY_PATH}?${suffix}` : HISTORY_PATH;
}

export default async function HistoryPage({ searchParams }: PageProps<"/historico">) {
  await connection();
  const user = await requireUser();
  const filters = readFilters(await searchParams);
  const repository = getMinutaRepository();
  const personaNames = repository.personaNames(user.id);
  const { items: minutas, total } = repository.search(user.id, {
    query: filters.query,
    personaName: filters.personaName,
    limit: PAGE_SIZE,
    offset: (filters.page - 1) * PAGE_SIZE,
  });
  const isFiltered = filters.query !== "" || filters.personaName !== ALL_PERSONAS;

  return (
    <Page
      title="Histórico"
      width="wide"
      description={
        <>
          Todas as minutas geradas ficam aqui para reabrir, revisar e baixar de novo. Minutas de lotes ficam em
          Lotes.
        </>
      }
      actions={
        <Button asChild>
          <Link href={NEW_MINUTA_PATH}>
            <FilePlus2 aria-hidden /> Nova minuta
          </Link>
        </Button>
      }
    >
      {(personaNames.length > 0 || isFiltered) && (
        <form role="search" action={HISTORY_PATH} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
          <div className="flex min-w-48 flex-1 flex-col gap-1.5">
            <Label htmlFor="busca-historico">Buscar</Label>
            <Input
              id="busca-historico"
              name="q"
              type="search"
              defaultValue={filters.query}
              placeholder="Título, tipo ou persona"
            />
          </div>
          <div className="flex min-w-40 flex-col gap-1.5">
            <Label htmlFor="persona-historico">Persona</Label>
            <select id="persona-historico" name="persona" defaultValue={filters.personaName} className={NATIVE_SELECT_CLASS}>
              <option value={ALL_PERSONAS}>Todas</option>
              {personaNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="outline">
            <Search aria-hidden /> Filtrar
          </Button>
          {isFiltered && (
            <Button asChild variant="ghost">
              <Link href={HISTORY_PATH}>Limpar</Link>
            </Button>
          )}
        </form>
      )}

      {minutas.length === 0 ? (
        isFiltered ? (
          <EmptyState
            icon={SearchX}
            title="Nenhuma minuta encontrada"
            description="Tente outras palavras ou outra persona."
          />
        ) : (
          <EmptyState
            icon={History}
            title="Nenhuma minuta gerada ainda"
            description="Cada minuta gerada fica salva aqui, com as revisões que você aplicar."
            action={
              <Button asChild>
                <Link href={NEW_MINUTA_PATH}>Gerar a primeira minuta</Link>
              </Button>
            }
          />
        )
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Minuta</TableHead>
                <TableHead className="hidden md:table-cell">Persona</TableHead>
                <TableHead className="hidden md:table-cell">Gerada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {minutas.map((minuta) => (
                <TableRow key={minuta.id}>
                  <TableCell className="whitespace-normal">
                    <Link href={minutaPath(minuta.id)} className="font-medium text-primary hover:underline">
                      {minuta.title}
                    </Link>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {minuta.documentTypeLabel}
                      <span className="md:hidden">
                        {" "}
                        · {minuta.personaName} · {formatDateTime(minuta.createdAt)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{minuta.personaName}</TableCell>
                  <TableCell className="hidden tabular-nums md:table-cell">{formatDateTime(minuta.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-start justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={minutaPath(minuta.id)}>Abrir</Link>
                      </Button>
                      <DeleteMinutaButton id={minuta.id} title={minuta.title} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pagination
        page={filters.page}
        pageSize={PAGE_SIZE}
        total={total}
        hrefFor={(page) => historyHref({ ...filters, page })}
      />
    </Page>
  );
}
