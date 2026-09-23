import { MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ASSISTANT_PATH, conversationPath } from "@/lib/chat/paths";
import type { ChatConversationSummary } from "@/lib/chat/types";
import { formatDateTime } from "@/lib/usage/format";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations: ChatConversationSummary[];
  activeId?: string;
}

/** The saved conversations, newest first, with a way to start a new one. */
export function ConversationList({ conversations, activeId }: ConversationListProps) {
  return (
    <nav className="flex flex-col gap-3" aria-label="Conversas">
      <Button asChild variant="outline" className="justify-start">
        <Link href={ASSISTANT_PATH}>
          <MessageSquarePlus aria-hidden /> Nova conversa
        </Link>
      </Button>
      {conversations.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={conversationPath(conversation.id)}
                aria-current={conversation.id === activeId ? "page" : undefined}
                className={cn(
                  "flex flex-col gap-0.5 rounded-md px-3 py-2 text-sm hover:bg-muted",
                  "aria-[current=page]:bg-primary/10",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium">{conversation.title}</span>
                  {conversation.isReplying && (
                    <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary" aria-label="Respondendo" />
                  )}
                </span>
                {conversation.preview && (
                  <span className="line-clamp-1 text-xs text-muted-foreground">{conversation.preview}</span>
                )}
                <span className="text-xs text-muted-foreground tabular-nums">{formatDateTime(conversation.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
