"use client";

import { useRouter } from "next/navigation";
import { ResetPasswordButton } from "@/components/team/ResetPasswordButton";
import { Button } from "@/components/ui/button";
import { NATIVE_SELECT_CLASS } from "@/components/ui/nativeSelect";
import { useJsonSubmit } from "@/hooks/useJsonSubmit";
import { USER_ROLES, USER_ROLE_LABELS, type User, type UserRole } from "@/lib/auth/types";
import { userEndpoint } from "@/lib/http/endpoints";
import { cn } from "@/lib/utils";

const UPDATE_FAILED = "Não foi possível atualizar a conta. Tente novamente.";

/** Role, access and password controls for one account; nobody can disable their own. */
export function UserRowActions({ user, isSelf }: { user: User; isSelf: boolean }) {
  const router = useRouter();
  const { isPending, error, submit } = useJsonSubmit();
  const isDisabled = user.disabledAt !== null;

  async function update(change: { role?: UserRole; disabled?: boolean }) {
    if (await submit("PATCH", userEndpoint(user.id), change, UPDATE_FAILED)) router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="sr-only" htmlFor={`role-${user.id}`}>
          Perfil de {user.displayName}
        </label>
        <select
          id={`role-${user.id}`}
          className={cn(NATIVE_SELECT_CLASS, "w-auto")}
          value={user.role}
          disabled={isPending || isDisabled}
          onChange={(event) => void update({ role: event.target.value as UserRole })}
        >
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {USER_ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        {!isDisabled && <ResetPasswordButton userId={user.id} name={user.displayName} />}
        {!isSelf && (
          <Button
            variant={isDisabled ? "outline" : "destructive"}
            size="sm"
            disabled={isPending}
            onClick={() => void update({ disabled: !isDisabled })}
          >
            {isDisabled ? "Reativar" : "Desativar"}
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
