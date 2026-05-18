import type { ChatState } from '@stream-ui/core';
import { useCallback, useRef, useSyncExternalStore } from 'react';
import { useChatContext } from '../provider.js';

/**
 * Subscribe to the chat state from the nearest <ChatProvider>.
 *
 * SSR-safe via `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`.
 * The server snapshot is the current snapshot — which on the server is
 * just the seed/initial state.
 *
 * Selectors that return derived objects are safe: results are cached
 * against the underlying state reference + last selected value, so
 * useSyncExternalStore sees a stable snapshot identity.
 */
export function useChat<TSelected = ChatState>(
  selector: (state: ChatState) => TSelected = (s) => s as unknown as TSelected,
): TSelected {
  const { store } = useChatContext();
  const cache = useRef<{ state: ChatState; selected: TSelected } | null>(null);

  const getSnapshot = useCallback((): TSelected => {
    const state = store.getSnapshot();
    const cached = cache.current;
    if (cached && cached.state === state) return cached.selected;
    const next = selector(state);
    if (cached && Object.is(cached.selected, next)) {
      cache.current = { state, selected: cached.selected };
      return cached.selected;
    }
    cache.current = { state, selected: next };
    return next;
  }, [store, selector]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

/** Convenience: pull the bound client (for `.send()` / `.start()`). */
export function useChatClient() {
  const { client } = useChatContext();
  if (!client) {
    throw new Error(
      '@stream-ui/react: useChatClient requires <ChatProvider client={...}>. ' +
        'For state-only providers, use useChat() instead.',
    );
  }
  return client;
}
