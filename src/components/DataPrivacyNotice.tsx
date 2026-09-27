import { ShieldAlert, ShieldCheck } from "lucide-react";
import { WarningCallout } from "@/components/ui/WarningCallout";
import { describeDataPrivacy } from "@/lib/llm/privacy";

/** Where the office's texts go with the current AI settings; a warning when a provider may keep them. */
export function DataPrivacyNotice() {
  const { level, drafting, library } = describeDataPrivacy();
  const body = (
    <div className="flex flex-col gap-1">
      <p className="font-medium">Privacidade dos dados</p>
      <p>{drafting}</p>
      <p>{library}</p>
    </div>
  );
  if (level === "warning") {
    return (
      <WarningCallout icon={ShieldAlert}>{body}</WarningCallout>
    );
  }
  return (
    <div role="status" className="flex gap-3 rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      {body}
    </div>
  );
}
