"use client";

import { Plug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { Button } from "@/components/ui/button";
import { LOADING_LABEL, useIsHydrated } from "@/hooks/useIsHydrated";
import { useJsonSubmit } from "@/hooks/useJsonSubmit";
import { NETWORK_ERROR_MESSAGE, readErrorMessage } from "@/lib/http/client";
import type { AuthorizationStartedResponseBody } from "@/lib/http/contracts";
import { JURISPRUDENCIAS_CONNECT_ENDPOINT, JURISPRUDENCIAS_INTEGRATION_ENDPOINT } from "@/lib/http/endpoints";

const CONNECT_FAILED = "Não foi possível iniciar a conexão. Tente novamente.";
const DISCONNECT_FAILED = "Não foi possível desconectar. Tente novamente.";

/** Connect (or reconnect) sends the admin to Jurisprudências.ai to authorize; disconnect forgets the tokens. */
export function JurisprudenciasConnection({ connected }: { connected: boolean }) {
  const router = useRouter();
  const isHydrated = useIsHydrated();
  const { isPending, error, submit } = useJsonSubmit();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  async function connect() {
    const response = await submit("POST", JURISPRUDENCIAS_CONNECT_ENDPOINT, {}, CONNECT_FAILED);
    if (!response) return;
    const { authorizationUrl } = (await response.json()) as AuthorizationStartedResponseBody;
    window.location.assign(authorizationUrl);
  }

  async function disconnect() {
    setIsDisconnecting(true);
    setDisconnectError(null);
    try {
      const response = await fetch(JURISPRUDENCIAS_INTEGRATION_ENDPOINT, { method: "DELETE" });
      if (!response.ok) setDisconnectError(await readErrorMessage(response, DISCONNECT_FAILED));
      else router.refresh();
    } catch {
      setDisconnectError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant={connected ? "outline" : "default"} disabled={!isHydrated || isPending} onClick={() => void connect()}>
          <Plug aria-hidden />
          {!isHydrated ? LOADING_LABEL : isPending ? "Abrindo a Jurisprudências.ai…" : connected ? "Conectar de novo" : "Conectar a conta do escritório"}
        </Button>
        {connected && (
          <ConfirmDeleteButton
            title="Desconectar a Jurisprudências.ai?"
            description="O Advogado IA deixa de pesquisar jurisprudência até que um administrador conecte de novo. Para revogar o acesso de vez, remova também o Magistral nas configurações da sua conta na Jurisprudências.ai."
            isPending={isDisconnecting}
            error={disconnectError}
            onConfirm={() => void disconnect()}
            actionLabel="Desconectar"
            pendingLabel="Desconectando…"
          />
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
