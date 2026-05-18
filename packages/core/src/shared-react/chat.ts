import type { Surface } from '@stream-ui/protocol';
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { type ChatClient, type CreateChatClientOptions, createChatClient } from '../client.js';
import type { ChatMessage, ChatState, RunStatus, ToolCall } from '../state/reducer.js';
import type { ReadableStore } from '../state/store.js';

export interface UseChatClientOptions extends CreateChatClientOptions {
  /**
   * When true (default), the client is disposed when the host unmounts.
   * Set to false if you own the client lifecycle externally.
   */
  autoDispose?: boolean;
}

export interface UseChatClientResult {
  client: ChatClient;
  state: ChatState;
  send: ChatClient['send'];
  start: ChatClient['start'];
  dispose: ChatClient['dispose'];
}

/**
 * Memoize a `ChatClient` for the lifetime of the host component.
 *
 * The client is created lazily on first render and torn down on unmount
 * (unless `autoDispose` is false). The returned `state` is reactive via
 * `useSyncExternalStore`.
 */
export function useChatClient(options: UseChatClientOptions): UseChatClientResult {
  const { autoDispose = true } = options;
  // We intentionally do NOT track changes to `options` — recreating the
  // client on every render would tear down the transport.
  const ref = useRef<ChatClient | null>(null);
  if (ref.current === null) {
    ref.current = createChatClient(options);
  }
  const client = ref.current;

  // biome-ignore lint/correctness/useExhaustiveDependencies: client + autoDispose are stable for the host's lifetime; rebinding would tear down the transport.
  useEffect(() => {
    return () => {
      if (autoDispose) {
        void client.dispose();
        ref.current = null;
      }
    };
  }, []);

  const state = useChatState(client.store);

  const send = useCallback((payload: unknown) => client.send(payload), [client]);
  const start = useCallback(() => client.start(), [client]);
  const dispose = useCallback(() => client.dispose(), [client]);

  return useMemo(
    () => ({
      client,
      state,
      send,
      start,
      dispose,
    }),
    [client, state, send, start, dispose],
  );
}

/**
 * Subscribe to a chat state store with `useSyncExternalStore`.
 *
 * Returns the full `ChatState`. For finer-grained subscriptions prefer
 * the dedicated `useMessages` / `useToolCalls` / `useSurface` hooks
 * which avoid re-rendering on unrelated state changes.
 */
export function useChatState(store: ReadableStore<ChatState>): ChatState {
  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store]);
  const getSnapshot = useCallback(() => store.getSnapshot(), [store]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function useStoreSelector<TState, TSelected>(
  store: ReadableStore<TState>,
  selector: (state: TState) => TSelected,
): TSelected {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store]);
  const getSnapshot = useCallback(() => selectorRef.current(store.getSnapshot()), [store]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useMessages(store: ReadableStore<ChatState>): ReadonlyArray<ChatMessage> {
  return useStoreSelector(store, (s) => s.messages);
}

export function useToolCalls(store: ReadableStore<ChatState>): ReadonlyArray<ToolCall> {
  return useStoreSelector(store, (s) => s.toolCalls);
}

export function useSurface(
  store: ReadableStore<ChatState>,
  surfaceId: string,
): Surface | undefined {
  return useStoreSelector(store, (s) => s.surfaces.get(surfaceId));
}

export function useAgentState(store: ReadableStore<ChatState>): unknown {
  return useStoreSelector(store, (s) => s.agentState);
}

export function useRunStatus(store: ReadableStore<ChatState>): RunStatus {
  return useStoreSelector(store, (s) => s.status);
}
