import {
  BookOpen,
  ChartColumn,
  FilePlus2,
  History,
  Layers,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  MessageSquareWarning,
  MessagesSquare,
  Scale,
  UserRoundPen,
  Users,
  type LucideIcon,
} from "lucide-react";
import { TEAM_PATH } from "@/lib/auth/paths";
import { BATCHES_PATH } from "@/lib/batch/paths";
import { ASSISTANT_PATH } from "@/lib/chat/paths";
import { CLAUSES_PATH } from "@/lib/clauses/paths";
import { FEEDBACK_PATH } from "@/lib/feedback/paths";
import { HISTORY_PATH, HOME_PATH, NEW_MINUTA_PATH } from "@/lib/minutas/paths";
import { PERSONAS_PATH } from "@/lib/personas/paths";
import { LIBRARY_PATH } from "@/lib/rag/paths";
import { TASKS_PATH } from "@/lib/tasks/paths";
import { USAGE_PATH } from "@/lib/usage/paths";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavGroup {
  /** Null for the ungrouped links at the top. */
  label: string | null;
  links: readonly NavLink[];
}

/** Creating documents, the office's reference material, and the system itself. */
export const NAV_GROUPS: readonly NavGroup[] = [
  { label: null, links: [{ href: HOME_PATH, label: "Início", icon: LayoutDashboard }] },
  {
    label: "Criar",
    links: [
      { href: NEW_MINUTA_PATH, label: "Nova minuta", icon: FilePlus2 },
      { href: ASSISTANT_PATH, label: "Advogado IA", icon: MessagesSquare },
      { href: BATCHES_PATH, label: "Lotes", icon: Layers },
    ],
  },
  {
    label: "Acervo",
    links: [
      { href: HISTORY_PATH, label: "Histórico", icon: History },
      { href: PERSONAS_PATH, label: "Personas", icon: UserRoundPen },
      { href: CLAUSES_PATH, label: "Cláusulas", icon: ListChecks },
      { href: LIBRARY_PATH, label: "Biblioteca", icon: BookOpen },
    ],
  },
  {
    label: "Sistema",
    links: [
      { href: TASKS_PATH, label: "Tarefas", icon: ListTodo },
      { href: USAGE_PATH, label: "Uso", icon: ChartColumn, adminOnly: true },
      { href: TEAM_PATH, label: "Equipe", icon: Users, adminOnly: true },
      { href: FEEDBACK_PATH, label: "Feedback", icon: MessageSquareWarning, adminOnly: true },
    ],
  },
];

export const BRAND_ICON = Scale;

/** The link for a path: the home link only on the dashboard itself, others for their whole section. */
export function isActiveLink(pathname: string, href: string): boolean {
  return href === HOME_PATH ? pathname === HOME_PATH : pathname === href || pathname.startsWith(`${href}/`);
}
