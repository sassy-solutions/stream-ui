import type { AgUiEvent } from '@stream-ui/protocol';
import { agUiFormFixture, agUiTextStreamFixture, checkoutFormSpec } from '@stream-ui/testing';

/**
 * POST /chat — returns an AG-UI event stream as `text/event-stream`.
 *
 * Demo wiring: instead of calling a real LLM, we replay the testing
 * fixtures (`agUiTextStreamFixture` → `agUiFormFixture(checkoutFormSpec)`)
 * with a short delay between frames so the form appears progressively
 * in the browser. Real LLM integration (e.g. `@ai-sdk/anthropic`) plugs
 * in here — see CHAT 07 docs for a recipe.
 *
 * Each AG-UI event is serialized as one SSE frame:
 *
 *     event: <wire-type>
 *     data: <json>
 *
 * The client side reads this through `@stream-ui/core`'s SSE transport
 * (`createSseTransport`), which is wired up by the `<ChatClient>`
 * component.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

function frame(event: AgUiEvent): Uint8Array {
  return encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
}

async function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;
  await new Promise<void>((resolve) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        resolve();
      },
      { once: true },
    );
  });
}

export async function POST(request: Request): Promise<Response> {
  // The assistant message id must match the surfaceId so that
  // `useFormFromMessage` can lookup the form via its parent message.
  const messageId = `msg-${Date.now()}`;
  const runId = `run-${Date.now()}`;
  const assistantText = 'Sure — here is your checkout form. Take a moment to fill it in:';

  const textEvents = agUiTextStreamFixture(assistantText, {
    messageId,
    runId,
    chunkSize: 6,
    withRunFraming: false,
  });
  const formEvents = agUiFormFixture(checkoutFormSpec, {
    surfaceId: messageId,
    runId,
    withRunFraming: false,
  });

  // RUN_STARTED at the top, the rest in the middle, RUN_FINISHED to close.
  const events: AgUiEvent[] = [
    { type: 'RUN_STARTED', runId },
    ...textEvents,
    ...formEvents,
    { type: 'RUN_FINISHED', runId, reason: 'stop' },
  ];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const ac = new AbortController();
      const onClientAbort = () => ac.abort();
      request.signal.addEventListener('abort', onClientAbort, { once: true });

      try {
        for (const event of events) {
          if (ac.signal.aborted) break;
          controller.enqueue(frame(event));
          // Text deltas: small pause to feel like real token streaming.
          // Other events: a touch longer so the form pops in distinctly.
          const delay = event.type === 'TEXT_MESSAGE_CONTENT' ? 35 : 120;
          await sleep(delay, ac.signal);
        }
      } finally {
        request.signal.removeEventListener('abort', onClientAbort);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
