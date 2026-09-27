"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ACCOUNT_PATH, LOGIN_PATH } from "@/lib/auth/paths";
import { USER_ROLE_LABELS, type CurrentUser } from "@/lib/auth/types";
import { removeLocalValues } from "@/lib/browser/localValue";
import { LOGOUT_ENDPOINT } from "@/lib/http/api";
import { MINUTA_DRAFT_STORAGE_PREFIX } from "@/lib/minuta/storedDraft";

/** Who is signed in, a link to their account and signing out (which also clears private drafts here). */
export function UserMenu({ user }: { user: CurrentUser }) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    try {
      await fetch(LOGOUT_ENDPOINT, { method: "POST" });
    } finally {
      removeLocalValues(MINUTA_DRAFT_STORAGE_PREFIX);
      window.location.assign(LOGIN_PATH);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={`Conta de ${user.displayName}`}>
          <UserRound aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-64 flex-col gap-3">
        <div className="flex flex-col">
          <span className="font-medium">{user.displayName}</span>
          <span className="text-xs text-muted-foreground">
            {user.username} · {USER_ROLE_LABELS[user.role]}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <Button asChild variant="ghost" size="sm" className="justify-start">
            <Link href={ACCOUNT_PATH}>Minha conta</Link>
          </Button>
          <Button variant="ghost" size="sm" className="justify-start" disabled={isSigningOut} onClick={() => void signOut()}>
            <LogOut aria-hidden />
            {isSigningOut ? "Saindo…" : "Sair"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
