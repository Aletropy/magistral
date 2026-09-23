import type { ReactNode } from "react";
import { formatStyleProfile } from "@/lib/style/formatStyleProfile";
import type { StyleProfile } from "@/lib/style/styleProfileSchema";

interface StyleProfileCardProps {
  profile: StyleProfile;
  /** Extra controls shown in the card header, e.g. a remove button. */
  action?: ReactNode;
}

/** Read-only view of a captured style profile, exactly as the prompt will describe it. */
export function StyleProfileCard({ profile, action }: StyleProfileCardProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">Perfil de estilo capturado</h2>
        {action}
      </div>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
        {formatStyleProfile(profile).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
