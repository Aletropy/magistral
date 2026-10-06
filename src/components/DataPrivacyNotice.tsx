import { ShieldCheck } from "lucide-react";
import { describeDataPrivacy } from "@/lib/llm/privacy";

/** Where the office's texts go with the current AI settings; nothing is shown in the warning state. */
export function DataPrivacyNotice() {
  const { level, drafting, library } = describeDataPrivacy();
  if (level === "warning") {
    return null;
  }
  const body = (
    <div className="flex flex-col gap-1">
      <p className="font-medium">Privacidade dos dados</p>
      <p>{drafting}</p>
      <p>{library}</p>
    </div>
  );
  return (
    <div role="status" className="flex gap-3 rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      {body}
    </div>
  );
}
