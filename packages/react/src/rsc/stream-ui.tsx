import { type ChatState, initialChatState, reduce } from '@stream-ui/core';
import type { AgUiEvent } from '@stream-ui/protocol';
/**
 * RSC streaming helper for Next.js 15 App Router.
 *
 * `streamChatUI(events, render)` consumes an async iterable of AG-UI
 * events server-side, folds them through the core reducer, and yields
 * React elements at every meaningful state transition.
 *
 * Designed for Server Components: callers iterate the result inside an
 * RSC and `await` each chunk to drive `<Suspense>` boundaries.
 *
 * ```tsx
 * // app/chat/page.tsx
 * import { streamChatUI } from '@stream-ui/react/rsc';
 *
 * export default async function Page() {
 *   const events = createServerEventStream();
 *   return (
 *     <ul>
 *       {await collect(streamChatUI(events, (state) =>
 *         state.messages.map((m) => <li key={m.id}>{m.text}</li>),
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 *
 * Pure async generator — no `"use client"`. Re-exporting it through a
 * client boundary will fail, which is intentional.
 */
import type { ReactNode } from 'react';

export interface StreamChatUIOptions {
  /** Seed state (e.g. when resuming a thread). */
  initialState?: Partial<ChatState>;
  /**
   * Skip emitting after events that did not change the state object.
   * Defaults to `true`.
   */
  dedupe?: boolean;
}

export async function* streamChatUI(
  events: AsyncIterable<AgUiEvent>,
  render: (state: ChatState) => ReactNode,
  options: StreamChatUIOptions = {},
): AsyncGenerator<ReactNode, void, void> {
  const { dedupe = true } = options;
  let state: ChatState = {
    ...initialChatState,
    ...(options.initialState ?? {}),
    surfaces:
      options.initialState?.surfaces instanceof Map
        ? options.initialState.surfaces
        : initialChatState.surfaces,
  };

  // Emit the initial render so consumers see seed state immediately.
  yield render(state);

  for await (const event of events) {
    const next = reduce(state, event);
    if (dedupe && next === state) continue;
    state = next;
    yield render(state);
  }
}

/** Drain an async iterable of nodes into a single array (handy for tests). */
export async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const v of iter) out.push(v);
  return out;
}
