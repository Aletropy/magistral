"use client";

import { MessageSquarePlus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ASSISTANT_PATH, conversationPath } from "@/lib/chat/paths";
import type { ChatConversationSummary } from "@/lib/chat/types";
import { normalizeForMatch } from "@/lib/text/normalizeForMatch";
import { formatDateTime } from "@/lib/usage/format";
import { cn } from "@/lib/utils";

/** Past this many conversations the list offers a search box. */
const FILTER_THRESHOLD = 6;

interface ConversationListProps {
  conversations: ChatConversationSummary[];
  activeId?: string;
}

/** The saved conversations, newest first, with a way to start a new one and to find an old one. */
export function ConversationList({ conversations, activeId }: ConversationListProps) {
  const [filter, setFilter] = useState("");
  const visible = useMemo(() => {
    const wanted = normalizeForMatch(filter.trim());
    if (!wanted) return conversations;
    return conversations.filter((conversation) =>
      normalizeForMatch(`${conversation.title} ${conversation.preview ?? ""}`).includes(wanted),
    );
  }, [conversations, filter]);

  return (
    <nav className="flex flex-col gap-3" aria-label="Conversas">
      <Button asChild variant="outline" className="justify-start">
        <Link href={ASSISTANT_PATH}>
          <MessageSquarePlus aria-hidden /> Nova conversa
        </Link>
      </Button>
      {conversations.length > FILTER_THRESHOLD && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label="Buscar conversas"
            placeholder="Buscar conversas"
            className="pl-8"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>
      )}
      {conversations.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
      ) : visible.length === 0 ? (
        <p className="px-1 text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {visible.map((conversation) => (
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
