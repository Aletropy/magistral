import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { DataPrivacyNotice } from "@/components/DataPrivacyNotice";
import { Page } from "@/components/layout/Page";
import { BACKUPS_KEPT } from "@/lib/db/backup";
import { TASK_RETENTION_DAYS } from "@/lib/tasks/getTaskWorker";
import { SESSION_TTL_MS } from "@/lib/auth/config";
import { getReleaseInfo } from "@/lib/config/release";

export const metadata: Metadata = { title: "Privacidade dos dados" };

const HOUR_MS = 60 * 60 * 1000;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

/** Public: what the app stores, where texts go and for how long; linked from sign-in and setup. */
export default async function PrivacyPage() {
  await connection();
  const { isTestRelease } = getReleaseInfo();

  return (
    <Page
      title="Privacidade dos dados"
      width="narrow"
      description="Como o Magistral trata as minutas, as conversas e os documentos do escritório."
    >
      <DataPrivacyNotice />

      <Section title="Onde os dados ficam">
        <p>
          Tudo fica no servidor do escritório, num banco de dados que só a conta do servidor consegue ler. Cada pessoa
          entra com a própria conta.
        </p>
        <p>
          Minutas, conversas com o Advogado IA, lotes e tarefas são de quem os criou: outras pessoas do escritório não
          os veem. Personas, cláusulas aprovadas e a biblioteca jurídica são compartilhadas pelo escritório.
        </p>
      </Section>

      <Section title="Por quanto tempo">
        <ul className="list-disc pl-5">
          <li>Minutas e conversas ficam até você excluí-las.</li>
          <li>
            Tarefas concluídas e notificações são apagadas depois de {TASK_RETENTION_DAYS} dias. O texto de documentos
            enviados para leitura é apagado da tarefa assim que ela termina.
          </li>
          <li>A sessão expira depois de {SESSION_TTL_MS / HOUR_MS} horas sem uso.</li>
          <li>Cópias de segurança diárias do banco são guardadas por {BACKUPS_KEPT} dias.</li>
        </ul>
      </Section>

      <Section title="Seus direitos (LGPD)">
        <p>
          Você pode excluir suas minutas e conversas a qualquer momento. Para corrigir ou excluir sua conta, ou para
          saber quais dados existem sobre você, fale com o administrador do escritório. Itens excluídos saem das cópias
          de segurança em até {BACKUPS_KEPT} dias.
        </p>
      </Section>

      {isTestRelease && (
        <Section title="Versão de teste">
          <p>
            Esta é uma versão de teste. Use dados fictícios sempre que possível: os dados de teste podem ser apagados
            quando a versão final for publicada.
          </p>
        </Section>
      )}
    </Page>
  );
}
