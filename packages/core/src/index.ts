/**
 * @stream-ui/core — pure-TS runtime for AG-UI + A2UI.
 *
 * Public surface:
 *   - `createChatClient` — high-level chat client (transport + state).
 *   - Transport contracts + SSE/WebSocket transports.
 *   - Incremental JSON parser (best-effort partial parsing for tool calls).
 *   - A2UI surface reducer.
 *   - Chat-state reducer + tiny `useSyncExternalStore`-compatible store.
 *   - Form engine (FormSpec → state machine).
 *
 * Zero runtime deps. Zero React imports. Target: ≤15KB ESM gzipped.
 * The optional Zod adapter ships as a separate entry: `@stream-ui/core/adapters/zod`.
 */

// Client
export { createChatClient } from './client.js';
export type { ChatClient, CreateChatClientOptions } from './client.js';

// Transport
export type {
  Transport,
  TransportConnection,
  TransportConnectOptions,
} from './transport/index.js';
export {
  createSseTransport,
  createWebSocketTransport,
} from './transport/index.js';
export type {
  SseTransportOptions,
  WebSocketTransportOptions,
} from './transport/index.js';
export { drainFrames, parseSseFrame } from './transport/sse.js';

// Parsers
export {
  IncrementalJsonParser,
  parsePartial,
} from './parser/incremental-json.js';
export {
  applyPatch,
  findComponent,
  reduceSurfaces,
} from './parser/a2ui.js';

// State
export { createStore } from './state/store.js';
export type { ReadableStore, Store } from './state/store.js';
export { initialChatState, reduce } from './state/reducer.js';
export type {
  ChatMessage,
  ChatState,
  MessageRole,
  RunStatus,
  ToolCall,
} from './state/reducer.js';

// Form
export { createFormEngine, initialValues } from './form/engine.js';
export type {
  FormEngine,
  FormEngineOptions,
  FormState,
  FormStatus,
} from './form/engine.js';
export {
  composeValidators,
  specConstraintsValidator,
  validateField,
} from './form/validator.js';
export type {
  FieldErrors,
  FormValues,
  Validator,
} from './form/validator.js';
