import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  /** 1-based. */
  page: number;
  pageSize: number;
  total: number;
  /** The URL of a page, keeping the list's other query parameters. */
  hrefFor: (page: number) => string;
}

/** "21–40 de 57" with previous and next links; nothing when everything fits on one page. */
export function Pagination({ page, pageSize, total, hrefFor }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground tabular-nums">
        {first}–{last} de {total}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page - 1)} rel="prev">
              <ChevronLeft aria-hidden /> Anterior
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft aria-hidden /> Anterior
          </Button>
        )}
        {page < pages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefFor(page + 1)} rel="next">
              Próxima <ChevronRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Próxima <ChevronRight aria-hidden />
          </Button>
        )}
      </div>
    </nav>
  );
}

/** The page number from a `?pagina=` value; anything invalid is the first page. */
export function readPageParam(value: string | string[] | undefined): number {
  const page = Number(typeof value === "string" ? value : "1");
  return Number.isInteger(page) && page >= 1 ? page : 1;
}
