"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False in the server HTML and until React takes over the page, true after. Forms use it to keep their
 * submit button disabled while the page's code is still downloading (slow networks, dev builds), so a
 * click never falls back to a plain HTML submission.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/** What a submit button says while the page's code is still loading. */
export const LOADING_LABEL = "Carregando…";
