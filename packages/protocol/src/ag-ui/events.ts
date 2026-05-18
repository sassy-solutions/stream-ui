/**
 * AG-UI event types.
 *
 * Mirrors the event surface documented at https://docs.ag-ui.com/.
 *
 * Naming choice: the AG-UI spec uses SCREAMING_SNAKE_CASE `type` discriminants
 * on the wire (e.g. `TEXT_MESSAGE_CONTENT`), while the issue asked for
 * PascalCase TypeScript identifiers (e.g. `TextMessageContent`). We expose
 * both: PascalCase interfaces for ergonomics + a `AgUiEventType` enum-like
 * union of the wire values for runtime checks. The `type` field on each
 * interface is narrowed to its wire value via a const literal.
 *
 * This file is types-only — zero runtime emit after tree-shake (the const
 * `AG_UI_EVENT_TYPES` is a `const` object kept tiny; consumers can elide it).
 */

// ---------- Wire-level type tags ----------

export const AG_UI_EVENT_TYPES = {
  RUN_STARTED: 'RUN_STARTED',
  RUN_FINISHED: 'RUN_FINISHED',
  RUN_ERROR: 'RUN_ERROR',
  TEXT_MESSAGE_START: 'TEXT_MESSAGE_START',
  TEXT_MESSAGE_CONTENT: 'TEXT_MESSAGE_CONTENT',
  TEXT_MESSAGE_END: 'TEXT_MESSAGE_END',
  TOOL_CALL_START: 'TOOL_CALL_START',
  TOOL_CALL_ARGS: 'TOOL_CALL_ARGS',
  TOOL_CALL_END: 'TOOL_CALL_END',
  STATE_SNAPSHOT: 'STATE_SNAPSHOT',
  STATE_DELTA: 'STATE_DELTA',
  UI_SURFACE_UPDATE: 'UI_SURFACE_UPDATE',
  CUSTOM: 'CUSTOM',
} as const;

export type AgUiEventType = (typeof AG_UI_EVENT_TYPES)[keyof typeof AG_UI_EVENT_TYPES];

// ---------- Shared primitives ----------

/** A monotonically-increasing timestamp in ms (server clock). Optional. */
export type Timestamp = number;

/** Per-run identifier emitted by the agent. */
export type RunId = string;

/** Per-message identifier. */
export type MessageId = string;

/** Per-tool-call identifier. */
export type ToolCallId = string;

interface BaseEvent {
  type: AgUiEventType;
  /** Optional server-side timestamp. */
  timestamp?: Timestamp;
  /** Optional run correlation id. Some streams omit it on framing-only events. */
  runId?: RunId;
}

// ---------- Run lifecycle ----------

export interface RunStarted extends BaseEvent {
  type: typeof AG_UI_EVENT_TYPES.RUN_STARTED;
  runId: RunId;
  /** Optional thread/conversation id this run belongs to. */
  threadId?: string;
}

export interface RunFinished extends BaseEvent {
  type: typeof AG_UI_EVENT_TYPES.RUN_FINISHED;
  runId: RunId;
  /** Optional finish reason — e.g. "stop", "length", "tool_calls". */
  reason?: string;
}

export interface RunError extends BaseEvent {
  type: typeof AG_UI_EVENT_TYPES.RUN_ERROR;
  runId: RunId;
  message: string;
  /** Optional error code (machine-readable). */
  code?: string;
}

// ---------- Text streaming ----------

export interface TextMessageStart extends BaseEvent {
  type: typeof AG_UI_EVENT_TYPES.TEXT_MESSAGE_START;
  messageId: MessageId;
  /** "assistant" by default; AG-UI also allows "tool" / "system". */
  role?: 'assistant' | 'tool' | 'system';
}

export interface TextMessageContent extends BaseEvent {
  type: typeof AG_UI_EVENT_TYPES.TEXT_MESSAGE_CONTENT;
  messageId: MessageId;
  /** Incremental text delta — append to existing buffer. */
  delta: string;
}

export interface TextMessageEnd extends BaseEvent {
  type: typeof AG_UI_EVENT_TYPES.TEXT_MESSAGE_END;
  messageId: MessageId;
}

// ---------- Tool calls ----------

export interface ToolCallStart extends BaseEvent {
  type: typeof AG_UI_EVENT_TYPES.TOOL_CALL_START;
  toolCallId: ToolCallId;
  toolName: string;
  /** Parent message id if the tool call is anchored to a message. */
  parentMessageId?: MessageId;
}

export interface ToolCallArgs extends BaseEvent {
  type: typeof AG_UI_EVENT_TYPES.TOOL_CALL_ARGS;
  toolCallId: ToolCallId;
  /**
   * JSON-fragment delta. Consumers concatenate, then JSON.parse at end.
   * Use the `@stream-ui/core` incremental parser for partial-value access.
   */
  argsDelta: string;
}

export interface ToolCallEnd extends BaseEvent {
  type: typeof AG_UI_EVENT_TYPES.TOOL_CALL_END;
  toolCallId: ToolCallId;
}

// ---------- State sync ----------

export interface StateSnapshot<TState = unknown> extends BaseEvent {
  type: typeof AG_UI_EVENT_TYPES.STATE_SNAPSHOT;
  state: TState;
}

export interface StateDelta extends BaseEvent {
  type: typeof AG_UI_EVENT_TYPES.STATE_DELTA;
  /**
   * RFC-6902 JSON-Patch operations. We type loosely to avoid pulling
   * a runtime dep; consumers can refine via a JSON-patch library.
   */
  patch: ReadonlyArray<JsonPatchOp>;
}

export interface JsonPatchOp {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: unknown;
  from?: string;
}

// ---------- UI surface updates (A2UI carrier) ----------

import type { Surface, SurfacePatch } from '../a2ui/surface.js';

/**
 * Carrier event for A2UI surface payloads. AG-UI core spec doesn't fix a
 * canonical name for this; we use UI_SURFACE_UPDATE and document it.
 * Either the full surface (`surface`) or an incremental patch (`patch`)
 * is provided.
 */
export interface UISurfaceUpdate extends BaseEvent {
  type: typeof AG_UI_EVENT_TYPES.UI_SURFACE_UPDATE;
  surfaceId: string;
  surface?: Surface;
  patch?: SurfacePatch;
}

// ---------- Custom escape hatch ----------

export interface CustomEvent<TName extends string = string, TPayload = unknown> extends BaseEvent {
  type: typeof AG_UI_EVENT_TYPES.CUSTOM;
  name: TName;
  payload: TPayload;
}

// ---------- Discriminated union ----------

export type AgUiEvent =
  | RunStarted
  | RunFinished
  | RunError
  | TextMessageStart
  | TextMessageContent
  | TextMessageEnd
  | ToolCallStart
  | ToolCallArgs
  | ToolCallEnd
  | StateSnapshot
  | StateDelta
  | UISurfaceUpdate
  | CustomEvent;
