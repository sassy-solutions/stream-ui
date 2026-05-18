import type { Transport, TransportConnectOptions, TransportConnection } from '@stream-ui/core';
import type { AgUiEvent } from '@stream-ui/protocol';

export type DelayFn = (event: AgUiEvent, index: number) => number;

export interface MockTransportOptions {
  /** Ordered list of events to replay through `onEvent`. */
  script: ReadonlyArray<AgUiEvent>;
  /**
   * Delay (ms) between successive event emissions. May be a constant or a
   * function. Default `0` (synchronous microtask flush).
   */
  delayMs?: number | DelayFn;
  /**
   * Auto-start replay as soon as `connect()` resolves. Default `true`.
   * When `false`, the consumer must call `transport.resume()` to begin.
   */
  autoStart?: boolean;
}

export interface MockTransport extends Transport {
  /** Begin or resume scripted playback. No-op if already playing or done. */
  resume(): void;
  /** Pause playback. The next event will not fire until `resume()` is called. */
  pause(): void;
  /**
   * Flush every remaining scripted event synchronously, ignoring delays.
   * Useful as the "fast-forward" button at the end of a test.
   */
  flushAll(): void;
  /**
   * Promise that resolves once every scripted event has been emitted AND
   * the connection has been closed (either via `flushAll`, exhaustion, or
   * an explicit `close()` call).
   */
  readonly drained: Promise<void>;
  /** All payloads passed to the connection's `send()` since `connect()`. */
  readonly sent: ReadonlyArray<unknown>;
}

const NOOP = () => {};

/**
 * Create an in-memory `Transport` that replays a fixed script of AG-UI
 * events. Use this in tests to exercise `createChatClient` / `useChat`
 * without a real SSE/WS server.
 *
 * - `delayMs` controls the gap between events. Pair with vitest fake
 *   timers (`vi.useFakeTimers()`) for deterministic stepping.
 * - `pause()` / `resume()` give you per-event control. After `pause()`
 *   the next scheduled event is cancelled and re-armed on `resume()`.
 * - `flushAll()` drains remaining events synchronously — handy as a
 *   final teardown step regardless of fake-timer state.
 */
export function createMockTransport(opts: MockTransportOptions): MockTransport {
  const script = opts.script.slice();
  const delay = opts.delayMs ?? 0;
  const autoStart = opts.autoStart ?? true;
  const sent: unknown[] = [];

  let index = 0;
  let onEvent: ((evt: AgUiEvent) => void) | null = null;
  let signal: AbortSignal | undefined;
  let onAbort: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let paused = !autoStart;
  let closed = false;
  let drainResolve: () => void = NOOP;
  const drained = new Promise<void>((resolve) => {
    drainResolve = resolve;
  });
  let closeResolve: () => void = NOOP;
  const closedPromise = new Promise<void>((resolve) => {
    closeResolve = resolve;
  });

  const delayFor = (evt: AgUiEvent, i: number): number => {
    if (typeof delay === 'function') return Math.max(0, delay(evt, i));
    return Math.max(0, delay);
  };

  const finish = () => {
    if (closed) return;
    closed = true;
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
    if (signal && onAbort) {
      signal.removeEventListener('abort', onAbort);
    }
    drainResolve();
    closeResolve();
  };

  const fire = () => {
    timer = null;
    if (closed || paused) return;
    if (index >= script.length) {
      finish();
      return;
    }
    const evt = script[index];
    index += 1;
    if (evt && onEvent) {
      try {
        onEvent(evt);
      } catch {
        // Consumer-thrown errors must not corrupt the schedule; tests can
        // surface them via the `onError` hook if needed.
      }
    }
    schedule();
  };

  const schedule = () => {
    if (closed || paused) return;
    if (index >= script.length) {
      finish();
      return;
    }
    const next = script[index];
    if (!next) {
      finish();
      return;
    }
    const ms = delayFor(next, index);
    timer = setTimeout(fire, ms);
  };

  const transport: MockTransport = {
    async connect(connectOpts: TransportConnectOptions): Promise<TransportConnection> {
      onEvent = connectOpts.onEvent;
      signal = connectOpts.signal;
      if (signal) {
        if (signal.aborted) {
          finish();
        } else {
          onAbort = () => finish();
          signal.addEventListener('abort', onAbort, { once: true });
        }
      }
      // Kick off replay (unless paused).
      if (!paused) schedule();
      const connection: TransportConnection = {
        async send(payload) {
          sent.push(payload);
        },
        close() {
          finish();
        },
        closed: closedPromise,
      };
      return connection;
    },
    resume() {
      if (!paused || closed) return;
      paused = false;
      schedule();
    },
    pause() {
      if (paused || closed) return;
      paused = true;
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    },
    flushAll() {
      if (closed) return;
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
      while (index < script.length) {
        const evt = script[index];
        index += 1;
        if (evt && onEvent) {
          try {
            onEvent(evt);
          } catch {
            /* swallow */
          }
        }
      }
      finish();
    },
    get drained() {
      return drained;
    },
    get sent() {
      return sent;
    },
  };

  return transport;
}
