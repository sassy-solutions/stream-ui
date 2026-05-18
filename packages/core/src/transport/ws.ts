import type { AgUiEvent } from '@stream-ui/protocol';
import type { Transport, TransportConnectOptions, TransportConnection } from './index.js';

export interface WebSocketTransportOptions {
  /** WebSocket URL (`ws://` or `wss://`). */
  url: string;
  /** WebSocket sub-protocols. */
  protocols?: string | string[];
  /** Optional override for the global `WebSocket` constructor (testing/Node). */
  webSocket?: typeof globalThis.WebSocket;
}

/**
 * Minimal WebSocket transport. Each incoming text frame is expected to
 * be a JSON-encoded AG-UI event. Binary frames are dropped with a warning.
 */
export function createWebSocketTransport(opts: WebSocketTransportOptions): Transport {
  const Ctor = opts.webSocket ?? (globalThis.WebSocket as typeof globalThis.WebSocket | undefined);
  if (!Ctor) {
    throw new Error('createWebSocketTransport: WebSocket not available; pass opts.webSocket');
  }
  return {
    async connect(connectOpts) {
      return openWebSocketConnection(opts, Ctor, connectOpts);
    },
  };
}

function openWebSocketConnection(
  opts: WebSocketTransportOptions,
  Ctor: typeof globalThis.WebSocket,
  { onEvent, onError, signal }: TransportConnectOptions,
): Promise<TransportConnection> {
  return new Promise((resolve, reject) => {
    const ws = new Ctor(opts.url, opts.protocols);

    let resolveClosed!: () => void;
    let rejectClosed!: (err: unknown) => void;
    const closed = new Promise<void>((res, rej) => {
      resolveClosed = res;
      rejectClosed = rej;
    });
    let settled = false;

    const cleanup = () => {
      if (signal) signal.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      try {
        ws.close();
      } catch {
        /* swallow */
      }
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    ws.addEventListener('open', () => {
      if (settled) return;
      settled = true;
      resolve({
        async send(payload) {
          if (ws.readyState !== ws.OPEN) {
            throw new Error('WebSocket transport: socket not open');
          }
          ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
        },
        close() {
          try {
            ws.close();
          } catch {
            /* swallow */
          }
        },
        closed,
      });
    });

    ws.addEventListener('message', (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') {
        onError?.(new Error('WebSocket transport: binary frames are not supported'));
        return;
      }
      try {
        const parsed = JSON.parse(ev.data) as AgUiEvent;
        onEvent(parsed);
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    });

    ws.addEventListener('error', (ev: Event) => {
      const err = new Error('WebSocket transport: error');
      (err as { event?: Event }).event = ev;
      if (!settled) {
        settled = true;
        cleanup();
        reject(err);
      } else {
        onError?.(err);
      }
    });

    ws.addEventListener('close', () => {
      cleanup();
      if (!settled) {
        settled = true;
        rejectClosed(new Error('WebSocket transport: closed before open'));
        reject(new Error('WebSocket transport: closed before open'));
        return;
      }
      resolveClosed();
    });
  });
}
