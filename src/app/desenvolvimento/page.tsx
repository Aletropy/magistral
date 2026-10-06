import { ChartColumn, Plug } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { DesenvolvimentoLocked } from "@/components/DesenvolvimentoLocked";
import { Page } from "@/components/layout/Page";
import { requireAdmin } from "@/lib/auth/dal";
import { INTEGRATIONS_PATH } from "@/lib/integrations/paths";
import { isPinUnlocked, requireSystemUnlock, DEV_PIN } from "@/lib/systemPin";
import { USAGE_PATH } from "@/lib/usage/paths";

export const metadata: Metadata = { title: "Desenvolvimento" };

const SECTIONS = [
  {
    href: USAGE_PATH,
    icon: ChartColumn,
    title: "Uso",
    description: "Consumo de IA por dia, operação, modelo e pessoa.",
  },
  {
    href: INTEGRATIONS_PATH,
    icon: Plug,
    title: "Integrações",
    description: "Serviços externos que o Advogado IA pode consultar.",
  },
];

/** Uso and Integrações, behind the desenvolvimento PIN. */
export default async function DesenvolvimentoPage() {
  await connection();
  await requireAdmin();
  await requireSystemUnlock();
  if (!(await isPinUnlocked(DEV_PIN))) {
    return (
      <Page title="Desenvolvimento" description="Uso e integrações do escritório.">
        <DesenvolvimentoLocked />
      </Page>
    );
  }

  return (
    <Page title="Desenvolvimento" description="Uso e integrações do escritório.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SECTIONS.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-start gap-3 rounded-lg border bg-card p-4 transition hover:bg-muted/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
              <Icon className="size-4" />
            </span>
            <span className="flex flex-col">
              <span className="font-medium">{title}</span>
              <span className="text-sm text-muted-foreground">{description}</span>
            </span>
          </Link>
        ))}
      </div>
    </Page>
  );
}
