import type { AgUiEvent } from '@stream-ui/protocol';
import { streamChatUI } from '@stream-ui/react/rsc';
import { agUiFormFixture, agUiTextStreamFixture, checkoutFormSpec } from '@stream-ui/testing';
import Link from 'next/link';
import { Suspense } from 'react';

/**
 * Server-only demo of `streamChatUI` from `@stream-ui/react/rsc`.
 *
 * `streamChatUI` is an async generator: each yielded ReactNode is a
 * fresh render of the chat state after applying one more AG-UI event.
 * Inside an RSC, we drain the generator and render the final state.
 *
 * For a true progressively-streamed RSC experience, Next 15 will flush
 * `<Suspense>` boundaries as their children resolve. The
 * `<StreamedFinalState>` boundary below is awaited inside an async
 * server component, which lets Next emit HTML chunks as the iterator
 * advances.
 */
export const dynamic = 'force-dynamic';

async function* eventIterable(events: AgUiEvent[]): AsyncGenerator<AgUiEvent, void, void> {
  for (const e of events) {
    await new Promise((resolve) => setTimeout(resolve, 30));
    yield e;
  }
}

async function StreamedFinalState() {
  const events: AgUiEvent[] = [
    ...agUiTextStreamFixture(
      'Hello from a Server Component — these tokens were rendered server-side.',
      { messageId: 'rsc-msg-1', runId: 'rsc-run-1', chunkSize: 6, withRunFraming: true },
    ),
    ...agUiFormFixture(checkoutFormSpec, {
      surfaceId: 'rsc-msg-1',
      runId: 'rsc-run-1',
      withRunFraming: false,
    }),
  ];

  const iter = streamChatUI(eventIterable(events), (state) => (
    <div>
      <p>
        <strong>Status:</strong> {state.status} · <strong>Messages:</strong> {state.messages.length}{' '}
        · <strong>Surfaces:</strong> {state.surfaces.size}
      </p>
      {state.messages.map((m) => (
        <div key={m.id} className="message" data-role={m.role}>
          <strong>{m.role}: </strong>
          {m.text}
        </div>
      ))}
      {Array.from(state.surfaces.values()).map((surface) => (
        <p key={surface.id} className="muted">
          surface <code>{surface.id}</code> · root kind <code>{surface.root.kind}</code>
        </p>
      ))}
    </div>
  ));

  // Drain to the last frame — Next streams the final HTML as part of
  // the RSC payload. For frame-by-frame streaming, wrap each frame in
  // its own <Suspense> boundary (advanced; see PR body for notes).
  let last: import('react').ReactNode = null;
  for await (const node of iter) {
    last = node;
  }
  return <>{last}</>;
}

export default function RscDemoPage() {
  return (
    <main className="page">
      <nav className="links">
        <Link href="/">/ (SSR + client streaming)</Link>
        <Link href="/rsc-demo">/rsc-demo (server-only RSC)</Link>
      </nav>
      <h1>RSC streaming demo</h1>
      <p className="lead">
        This page never ships a client bundle for the chat tree. The AG-UI events are folded through{' '}
        <code>streamChatUI</code>
        server-side, and only the final HTML reaches the browser.
      </p>
      <section className="card">
        <Suspense fallback={<p className="muted">Folding AG-UI events…</p>}>
          <StreamedFinalState />
        </Suspense>
      </section>
    </main>
  );
}
