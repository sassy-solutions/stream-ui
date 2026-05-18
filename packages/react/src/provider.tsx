import {
  type ChatClient,
  type ChatState,
  type FormEngine,
  type ReadableStore,
  type Store,
  createStore,
  initialChatState,
} from '@stream-ui/core';
/**
 * <ChatProvider> — wraps a tree with a chat store + form-engine registry.
 *
 * The provider does NOT own a transport; it only owns state. Callers
 * either:
 *   - Pass an existing `client` from `createChatClient()`.
 *   - Pass an `initialState` (or omit it) — the provider creates a bare
 *     store for purely-local UIs (Storybook, RSC hydration, tests).
 *
 * Hooks read from the nearest provider so multiple chats can coexist.
 */
import { type ReactNode, createContext, useContext, useMemo, useRef } from 'react';

export interface ChatContextValue {
  store: ReadableStore<ChatState>;
  client?: ChatClient;
  /**
   * Per-form engines registered by hooks (e.g. useFormFromMessage). Engines
   * are memoized by `formId` so two consumers of the same spec share state.
   */
  forms: Map<string, FormEngine>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export interface ChatProviderProps {
  /** Optional pre-built chat client (recommended for live chats). */
  client?: ChatClient;
  /** Seed state when no client is provided. */
  initialState?: Partial<ChatState>;
  children?: ReactNode;
}

export function ChatProvider({ client, initialState, children }: ChatProviderProps) {
  // We keep the store stable for the provider's lifetime.
  const storeRef = useRef<Store<ChatState> | null>(null);
  if (storeRef.current === null && !client) {
    const seed: ChatState = {
      ...initialChatState,
      ...(initialState ?? {}),
      surfaces:
        initialState?.surfaces instanceof Map ? initialState.surfaces : initialChatState.surfaces,
    };
    storeRef.current = createStore(seed);
  }

  const value = useMemo<ChatContextValue>(
    () => ({
      store: client ? client.store : (storeRef.current as Store<ChatState>),
      client,
      forms: new Map(),
    }),
    [client],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error(
      '@stream-ui/react: missing <ChatProvider>. Wrap your tree with <ChatProvider client={...}>.',
    );
  }
  return ctx;
}
