"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { panelConversationStorageKey } from "@/lib/assistant/panelStorage";
import { pageTitleContext, type PageContextInput } from "@/lib/assistant/pageContext";
import { readLocalValue, subscribeLocalValues, writeLocalValue } from "@/lib/browser/localValue";
import { ASSISTANT_PATH } from "@/lib/chat/paths";

/** Ctrl+K (⌘K on a Mac) opens and closes the panel from any page. */
export const PANEL_SHORTCUT_KEY = "k";

interface OpenOptions {
  /** A conversation to show; null starts a new one; omitted continues the remembered one. */
  conversationId?: string | null;
}

interface AssistantPanelValue {
  isOpen: boolean;
  /** False on the Advogado IA's own pages, which already show the conversation. */
  isAvailable: boolean;
  conversationId: string | null;
  open: (options?: OpenOptions) => void;
  close: () => void;
  toggle: () => void;
  setConversationId: (id: string | null) => void;
  /** What the open page registered (AssistantContext), or else its title. Read when a message is sent. */
  currentContext: () => PageContextInput;
  register: (context: PageContextInput) => () => void;
}

const AssistantPanelContext = createContext<AssistantPanelValue | null>(null);

export function useAssistantPanel(): AssistantPanelValue {
  const value = useContext(AssistantPanelContext);
  if (!value) throw new Error("useAssistantPanel must be used inside AssistantProvider.");
  return value;
}

/** Keeps the panel's state across pages: open or not, the conversation it continues, the page's context. */
export function AssistantProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const pathname = usePathname();
  const storageKey = panelConversationStorageKey(userId);
  const [isOpen, setIsOpen] = useState(false);
  // The server can't see this browser's storage, so it renders with no remembered conversation.
  const conversationId = useSyncExternalStore(subscribeLocalValues, () => readLocalValue(storageKey), () => null);
  const registered = useRef<PageContextInput | null>(null);
  const isAvailable = !(pathname === ASSISTANT_PATH || pathname.startsWith(`${ASSISTANT_PATH}/`));

  const setConversationId = useCallback((id: string | null) => writeLocalValue(storageKey, id), [storageKey]);

  const open = useCallback(
    (options: OpenOptions = {}) => {
      if (options.conversationId !== undefined) setConversationId(options.conversationId);
      setIsOpen(true);
    },
    [setConversationId],
  );
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((wasOpen) => !wasOpen), []);

  const register = useCallback((context: PageContextInput) => {
    registered.current = context;
    return () => {
      if (registered.current === context) registered.current = null;
    };
  }, []);

  const currentContext = useCallback(() => registered.current ?? pageTitleContext(document.title), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === PANEL_SHORTCUT_KEY && !event.altKey) {
        event.preventDefault();
        if (isAvailable) toggle();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAvailable, toggle]);

  const value = useMemo(
    () => ({
      isOpen: isOpen && isAvailable,
      isAvailable,
      conversationId,
      open,
      close,
      toggle,
      setConversationId,
      currentContext,
      register,
    }),
    [isOpen, isAvailable, conversationId, open, close, toggle, setConversationId, currentContext, register],
  );

  return <AssistantPanelContext.Provider value={value}>{children}</AssistantPanelContext.Provider>;
}
