"use client";

import { MessagesSquare, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useStartConversation } from "@/hooks/useStartConversation";
import { conversationPath } from "@/lib/chat/paths";

const REVIEW_QUESTION = "Revise esta minuta: aponte riscos, lacunas e cláusulas que poderiam ser melhoradas.";
const JURISPRUDENCE_QUESTION =
  "Pesquise jurisprudência que sirva de fundamento para as cláusulas mais sensíveis desta minuta e use as decisões para fundamentar a resposta, sem citar fontes.";

type Purpose = "review" | "jurisprudence";

const PURPOSES: Record<Purpose, { question: string; label: string; pendingLabel: string; useLibrary: boolean; useJurisprudencia: boolean }> = {
  review: { question: REVIEW_QUESTION, label: "Conversar com o Advogado IA", pendingLabel: "Abrindo conversa…", useLibrary: true, useJurisprudencia: true },
  jurisprudence: {
    question: JURISPRUDENCE_QUESTION,
    label: "Pesquisar jurisprudência",
    pendingLabel: "Abrindo conversa…",
    useLibrary: false,
    useJurisprudencia: true,
  },
};

/**
 * Opens a conversation with the Advogado IA about a saved minuta, starting with a review request (or, when
 * the office's Jurisprudências.ai account is connected, a jurisprudence search for the minuta).
 */
export function DiscussMinutaButton({ minutaId, purpose = "review" }: { minutaId: string; purpose?: Purpose }) {
  const router = useRouter();
  const { start, isSending, error } = useStartConversation((id) => router.push(conversationPath(id)));
  const { question, label, pendingLabel, useLibrary, useJurisprudencia } = PURPOSES[purpose];
  const Icon = purpose === "review" ? MessagesSquare : Scale;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isSending}
        onClick={() => void start({ message: question, minutaId, useLibrary, useJurisprudencia })}
      >
        <Icon aria-hidden /> {isSending ? pendingLabel : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
