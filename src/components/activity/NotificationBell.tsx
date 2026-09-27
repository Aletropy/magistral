"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TaskProgressBar } from "@/components/tasks/TaskProgressBar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BATCHES_PATH } from "@/lib/batch/paths";
import { postJson } from "@/lib/http/client";
import type { NotificationsResponseBody } from "@/lib/http/contracts";
import { NOTIFICATIONS_ENDPOINT, NOTIFICATIONS_READ_ENDPOINT, taskCancelEndpoint } from "@/lib/http/endpoints";
import type { MarkReadRequest } from "@/lib/notifications/schema";
import type { AppNotification } from "@/lib/notifications/types";
import { TASKS_PATH } from "@/lib/tasks/paths";
import { TASK_KIND_LABELS } from "@/lib/tasks/types";
import { plural } from "@/lib/text/plural";
import { formatDateTime } from "@/lib/usage/format";
import { cn } from "@/lib/utils";
import { useActivity } from "./ActivityProvider";
import { OsNotificationsToggle } from "./OsNotificationsToggle";

/** Past this the badge shows "9+". */
const MAX_BADGE_COUNT = 9;

const LEVEL_DOT: Record<AppNotification["level"], string> = {
  success: "bg-primary",
  error: "bg-destructive",
  info: "bg-muted-foreground",
};

function markRead(request: MarkReadRequest): Promise<Response> {
  return postJson(NOTIFICATIONS_READ_ENDPOINT, request);
}

/** The nav's bell: unread count, running work with progress, recent notifications and the OS opt-in. */
export function NotificationBell() {
  const { activeTasks, activeBatches, unreadCount, refresh } = useActivity();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const busy = activeTasks.length > 0 || activeBatches > 0;
  const badge = unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(unreadCount);
  const label = unreadCount > 0 ? `Notificações (${plural(unreadCount, "não lida", "não lidas")})` : "Notificações";

  async function load() {
    try {
      const response = await fetch(NOTIFICATIONS_ENDPOINT, { cache: "no-store" });
      if (response.ok) setNotifications(((await response.json()) as NotificationsResponseBody).notifications);
    } catch {
      // Keep what is shown; the next open tries again.
    }
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) void load();
  }

  async function markAllRead() {
    await markRead({ all: true }).catch(() => null);
    await load();
    refresh();
  }

  function handleOpenNotification(notification: AppNotification) {
    setIsOpen(false);
    if (!notification.readAt) void markRead({ ids: [notification.id] }).then(refresh, () => null);
  }

  async function cancelTask(id: string) {
    await fetch(taskCancelEndpoint(id), { method: "POST" }).catch(() => null);
    refresh();
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="relative" aria-label={label} title={label}>
          <Bell aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-destructive px-1 text-[10px] leading-4 font-semibold text-white tabular-nums">
              {badge}
            </span>
          )}
          {busy && unreadCount === 0 && (
            <span className="absolute top-1 right-1 size-2 animate-pulse rounded-full bg-primary" aria-hidden />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex max-h-[min(36rem,80vh)] w-[min(24rem,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto">
        {busy && (
          <section className="flex flex-col gap-3" aria-label="Em andamento">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Em andamento</h2>
            {activeTasks.map((task) => (
              <div key={task.id} className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{TASK_KIND_LABELS[task.kind]}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => void cancelTask(task.id)}>
                    Cancelar
                  </Button>
                </div>
                <TaskProgressBar progress={task.progress} />
              </div>
            ))}
            {activeBatches > 0 && (
              <Link href={BATCHES_PATH} className="text-sm text-primary hover:underline" onClick={() => setIsOpen(false)}>
                {plural(activeBatches, "lote em andamento", "lotes em andamento")}
              </Link>
            )}
          </section>
        )}

        <section className="flex flex-col gap-2" aria-label="Notificações">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Notificações</h2>
            {unreadCount > 0 && (
              <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => void markAllRead()}>
                Marcar todas como lidas
              </Button>
            )}
          </div>
          {notifications === null ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <NotificationItem notification={notification} onOpen={handleOpenNotification} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="flex flex-col gap-3 border-t pt-3">
          <OsNotificationsToggle />
          <Link href={TASKS_PATH} className="text-sm text-primary hover:underline" onClick={() => setIsOpen(false)}>
            Ver todas as tarefas
          </Link>
        </footer>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
}) {
  const content = (
    <div className="flex gap-2">
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", LEVEL_DOT[notification.level])} aria-hidden />
      <div className="min-w-0">
        <p className={cn("text-sm", !notification.readAt && "font-medium")}>{notification.title}</p>
        {notification.body && <p className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>}
        <p className="text-xs text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
      </div>
    </div>
  );
  const className = "block rounded-md px-2 py-1.5 hover:bg-muted";
  return notification.href ? (
    <Link href={notification.href} className={className} onClick={() => onOpen(notification)}>
      {content}
    </Link>
  ) : (
    <button type="button" className={cn(className, "w-full text-left")} onClick={() => onOpen(notification)}>
      {content}
    </button>
  );
}
