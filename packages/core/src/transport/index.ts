import type { AgUiEvent } from '@stream-ui/protocol';

/**
 * Transport contract — abstracts the wire over which AG-UI events arrive.
 *
 * A transport is opened once per chat session via `connect`. It pushes
 * decoded `AgUiEvent`s into `onEvent` and signals end-of-stream by
 * resolving its connection's `closed` promise. Aborting the supplied
 * `AbortSignal` MUST cause the transport to terminate any in-flight work.
 */
export interface Transport {
  connect(opts: TransportConnectOptions): Promise<TransportConnection>;
}

export interface TransportConnectOptions {
  /** Called for each decoded AG-UI event. Synchronous; do not await. */
  onEvent: (event: AgUiEvent) => void;
  /** Called when the transport surfaces a non-fatal warning (e.g. parse error). */
  onError?: (error: Error) => void;
  /** Abort to terminate the connection. */
  signal?: AbortSignal;
}

export interface TransportConnection {
  /**
   * Send a payload to the agent. Behavior is transport-specific:
   * SSE typically POSTs to the same endpoint; WebSocket sends a frame.
   * Returns a promise that resolves once the payload has been flushed.
   */
  send(payload: unknown): Promise<void>;
  /** Close the connection. Idempotent. */
  close(): void;
  /** Resolves when the transport ends (server-closed, EOF, or abort). */
  readonly closed: Promise<void>;
}

export { createSseTransport } from './sse.js';
export type { SseTransportOptions } from './sse.js';
export { createWebSocketTransport } from './ws.js';
export type { WebSocketTransportOptions } from './ws.js';
