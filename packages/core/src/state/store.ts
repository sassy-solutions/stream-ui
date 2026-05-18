/**
 * Tiny `useSyncExternalStore`-compatible store. Read-only contract:
 *   - `subscribe(listener) => unsubscribe`
 *   - `getSnapshot() => state`
 *
 * Listeners are notified after each `set()`; if the next state is
 * referentially equal to the previous one, listeners are skipped.
 */
export interface ReadableStore<TState> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): TState;
}

export interface Store<TState> extends ReadableStore<TState> {
  /** Replace the current state. */
  set(next: TState): void;
  /** Read-modify-write helper. */
  update(updater: (prev: TState) => TState): void;
}

export function createStore<TState>(initial: TState): Store<TState> {
  let state = initial;
  const listeners = new Set<() => void>();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return state;
    },
    set(next) {
      if (next === state) return;
      state = next;
      for (const l of listeners) l();
    },
    update(updater) {
      const next = updater(state);
      if (next === state) return;
      state = next;
      for (const l of listeners) l();
    },
  };
}
