import type { ReactNode } from "react";

/** The centered panel of the sign-in and first-setup pages, which have no navigation. */
export function AuthCard({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-tight text-primary">Magistral</p>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
        {children}
      </div>
    </main>
  );
}
