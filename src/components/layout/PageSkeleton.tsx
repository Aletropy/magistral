/** Placeholder while a page's data loads: the page header and a few content blocks. */
export function PageSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8" aria-busy>
      <span className="sr-only">Carregando…</span>
      <div className="flex flex-col gap-2">
        <div className="h-8 w-64 max-w-full animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </main>
  );
}
