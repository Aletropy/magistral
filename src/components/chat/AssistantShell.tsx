import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ASSISTANT_PATH } from "@/lib/chat/paths";
import type { ChatConversationSummary } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { ConversationList } from "./ConversationList";

interface AssistantShellProps {
  conversations: ChatConversationSummary[];
  /** The open conversation; on phones the list then gives way to it. */
  activeId?: string;
  children: ReactNode;
}

/** The conversation list beside the open conversation (stacked on phones). */
export function AssistantShell({ conversations, activeId, children }: AssistantShellProps) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className={cn("lg:sticky lg:top-4", activeId ? "hidden lg:block" : "order-last lg:order-none")}>
        <ConversationList conversations={conversations} activeId={activeId} />
      </aside>
      <div className="flex min-w-0 flex-col gap-3">
        {activeId && (
          <Link href={ASSISTANT_PATH} className="flex items-center gap-1 text-sm text-primary hover:underline lg:hidden">
            <ChevronLeft className="size-4" aria-hidden /> Conversas
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}
