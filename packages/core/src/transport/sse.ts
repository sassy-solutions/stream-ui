import type { AgUiEvent } from '@stream-ui/protocol';
import type { Transport, TransportConnectOptions, TransportConnection } from './index.js';

export interface SseTransportOptions {
  /** Endpoint that streams `text/event-stream`. */
  url: string;
  /** HTTP method for the initial connect request. Default `POST`. */
  method?: 'GET' | 'POST';
  /** Initial body (e.g. system prompt, thread id). Stringified as JSON. */
  initialPayload?: unknown;
  /** Extra request headers. */
  headers?: Record<string, string>;
  /** Optional override for `fetch` (testing/Node compat). */
  fetch?: typeof globalThis.fetch;
  /**
   * URL to POST follow-up `send()` payloads to. Defaults to `url`.
   * If set to `null`, `send()` rejects (one-shot stream).
   */
  sendUrl?: string | null;
  /** Method to use for `send()` requests. Default `POST`. */
  sendMethod?: 'GET' | 'POST' | 'PUT';
}

/**
 * Create an SSE transport using the Fetch API. Reads `response.body`
 * via a `ReadableStream` reader, parses `event:`/`data:` frames, and
 * dispatches each `data:` JSON payload as an `AgUiEvent`.
 */
export function createSseTransport(opts: SseTransportOptions): Transport {
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('createSseTransport: global fetch is not available; pass opts.fetch');
  }
  return {
    async connect(connectOpts) {
      return openSseConnection(opts, fetchImpl, connectOpts);
    },
  };
}

async function openSseConnection(
  opts: SseTransportOptions,
  fetchImpl: typeof globalThis.fetch,
  { onEvent, onError, signal }: TransportConnectOptions,
): Promise<TransportConnection> {
  const localController = new AbortController();
  const combinedSignal = mergeSignals(signal, localController.signal);

  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    ...(opts.headers ?? {}),
  };
  const method = opts.method ?? 'POST';
  let body: string | undefined;
  if (opts.initialPayload !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
    body = JSON.stringify(opts.initialPayload);
  }

  const response = await fetchImpl(opts.url, {
    method,
    headers,
    body,
    signal: combinedSignal,
  });

  if (!response.ok) {
    throw new Error(`SSE connect failed: HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error('SSE connect failed: response has no body');
  }

  let resolveClosed!: () => void;
  let rejectClosed!: (err: unknown) => void;
  const closed = new Promise<void>((resolve, reject) => {
    resolveClosed = resolve;
    rejectClosed = reject;
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let done = false;

  const pump = async () => {
    try {
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = drainFrames(buffer, onEvent, onError);
      }
      // Flush remaining frame.
      buffer += decoder.decode();
      drainFrames(buffer, onEvent, onError);
      resolveClosed();
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') {
        resolveClosed();
      } else {
        rejectClosed(err);
      }
    }
  };

  void pump();

  const sendUrl = opts.sendUrl === undefined ? opts.url : opts.sendUrl;
  const sendMethod = opts.sendMethod ?? 'POST';

  return {
    async send(payload) {
      if (sendUrl === null) {
        throw new Error('SSE transport: sendUrl is disabled');
      }
      const res = await fetchImpl(sendUrl, {
        method: sendMethod,
        headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
        body: JSON.stringify(payload),
        signal: combinedSignal,
      });
      if (!res.ok) throw new Error(`SSE send failed: HTTP ${res.status}`);
      // Drain body so connections can be reused.
      try {
        await res.arrayBuffer();
      } catch {
        /* swallow */
      }
    },
    close() {
      if (done) return;
      done = true;
      localController.abort();
      try {
        reader.cancel().catch(() => {});
      } catch {
        /* swallow */
      }
    },
    closed,
  };
}

/**
 * Drain complete SSE frames from `buffer` and return what's left over.
 * A frame is terminated by `\n\n` (or `\r\n\r\n`).
 */
export function drainFrames(
  buffer: string,
  onEvent: (event: AgUiEvent) => void,
  onError?: (error: Error) => void,
): string {
  let rest = buffer;
  while (true) {
    const idx = findFrameBoundary(rest);
    if (idx < 0) return rest;
    const frame = rest.slice(0, idx);
    rest = rest.slice(idx).replace(/^(\r?\n){2}/, '');
    const event = parseSseFrame(frame);
    if (!event) continue;
    if (event.data === '[DONE]') {
      // Common SSE termination sentinel — ignore.
      continue;
    }
    try {
      const parsed = JSON.parse(event.data) as AgUiEvent;
      onEvent(parsed);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }
}

function findFrameBoundary(s: string): number {
  const a = s.indexOf('\n\n');
  const b = s.indexOf('\r\n\r\n');
  if (a < 0) return b;
  if (b < 0) return a;
  return Math.min(a, b);
}

interface SseFrame {
  event?: string;
  data: string;
  id?: string;
}

/** Parse a single SSE frame (the text up to but not including `\n\n`). */
export function parseSseFrame(frame: string): SseFrame | null {
  const lines = frame.split(/\r?\n/);
  let event: string | undefined;
  let id: string | undefined;
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line === '' || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    switch (field) {
      case 'event':
        event = value;
        break;
      case 'data':
        dataLines.push(value);
        break;
      case 'id':
        id = value;
        break;
      default:
        break;
    }
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n'), id };
}

function mergeSignals(a: AbortSignal | undefined, b: AbortSignal): AbortSignal {
  if (!a) return b;
  if (a.aborted) return a;
  const controller = new AbortController();
  const onAbort = (signal: AbortSignal) => () => controller.abort(signal.reason);
  a.addEventListener('abort', onAbort(a), { once: true });
  b.addEventListener('abort', onAbort(b), { once: true });
  return controller.signal;
}
