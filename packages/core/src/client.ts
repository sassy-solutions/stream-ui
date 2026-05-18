import type { AgUiEvent } from '@stream-ui/protocol';
import { type ChatState, initialChatState, reduce } from './state/reducer.js';
import { type ReadableStore, type Store, createStore } from './state/store.js';
import type { Transport, TransportConnection } from './transport/index.js';

export interface CreateChatClientOptions {
  transport: Transport;
  /** Seed the chat state — e.g. when resuming a thread. */
  initialState?: Partial<ChatState>;
  /** Hook for raw events (logging, custom reducers). Called before the built-in reducer. */
  onEvent?: (event: AgUiEvent) => void;
  /** Hook for transport-level errors (parse failures, IO). */
  onError?: (error: Error) => void;
}

export interface ChatClient {
  /** Read-only store of the current chat state. */
  store: ReadableStore<ChatState>;
  /**
   * Send a message to the agent (transport-defined wire shape).
   *
   * Lazily opens the transport on first call; subsequent calls reuse
   * the connection. Resolves once the payload has been flushed.
   */
  send(payload: unknown): Promise<void>;
  /** Force-open the transport without sending. */
  start(): Promise<void>;
  /** Dispose: closes the transport and resolves when it ends. */
  dispose(): Promise<void>;
}

export function createChatClient(opts: CreateChatClientOptions): ChatClient {
  const seed: ChatState = {
    ...initialChatState,
    ...(opts.initialState ?? {}),
    // Ensure surfaces is a fresh Map even when seeded.
    surfaces:
      opts.initialState?.surfaces instanceof Map
        ? opts.initialState.surfaces
        : initialChatState.surfaces,
  };
  const store: Store<ChatState> = createStore(seed);
  const controller = new AbortController();
  let connection: TransportConnection | null = null;
  let connecting: Promise<TransportConnection> | null = null;
  let disposed = false;

  const handleEvent = (event: AgUiEvent) => {
    opts.onEvent?.(event);
    store.update((prev) => reduce(prev, event));
  };
  const handleError = (err: Error) => {
    opts.onError?.(err);
  };

  const ensureConnected = async (): Promise<TransportConnection> => {
    if (disposed) throw new Error('createChatClient: client has been disposed');
    if (connection) return connection;
    if (connecting) return connecting;
    connecting = opts.transport
      .connect({
        onEvent: handleEvent,
        onError: handleError,
        signal: controller.signal,
      })
      .then((conn) => {
        connection = conn;
        return conn;
      })
      .finally(() => {
        connecting = null;
      });
    return connecting;
  };

  return {
    store,
    async send(payload) {
      const conn = await ensureConnected();
      await conn.send(payload);
    },
    async start() {
      await ensureConnected();
    },
    async dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      if (connection) {
        connection.close();
        try {
          await connection.closed;
        } catch {
          /* swallow */
        }
        connection = null;
      }
    },
  };
}
