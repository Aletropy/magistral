import { Badge } from "@/components/ui/badge";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/tasks/types";

const VARIANTS: Record<TaskStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  running: "secondary",
  succeeded: "default",
  failed: "destructive",
  canceled: "outline",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge variant={VARIANTS[status]}>{TASK_STATUS_LABELS[status]}</Badge>;
}
