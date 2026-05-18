import type { AgUiEvent, MessageId, Surface, ToolCallId } from '@stream-ui/protocol';
import { AG_UI_EVENT_TYPES } from '@stream-ui/protocol';
import { reduceSurfaces } from '../parser/a2ui.js';
import { parsePartial } from '../parser/incremental-json.js';

export type MessageRole = 'assistant' | 'tool' | 'system';

export interface ChatMessage {
  id: MessageId;
  role: MessageRole;
  text: string;
  /** True once a TEXT_MESSAGE_END for this id has arrived. */
  done: boolean;
}

export interface ToolCall {
  id: ToolCallId;
  name: string;
  /** Raw concatenated args delta. */
  argsRaw: string;
  /** Best-effort parsed args (may be partial). `undefined` until parseable. */
  args: unknown;
  /** True once TOOL_CALL_END has arrived. */
  done: boolean;
  parentMessageId?: MessageId;
}

export type RunStatus = 'idle' | 'running' | 'finished' | 'error';

export interface ChatState {
  status: RunStatus;
  runId?: string;
  /** Insertion-ordered messages. */
  messages: ReadonlyArray<ChatMessage>;
  /** Insertion-ordered tool calls. */
  toolCalls: ReadonlyArray<ToolCall>;
  /** Surface tree keyed by id. */
  surfaces: ReadonlyMap<string, Surface>;
  /** Last-known agent state from STATE_SNAPSHOT / STATE_DELTA. */
  agentState: unknown;
  /** Last error message, if any. */
  error?: { message: string; code?: string };
}

export const initialChatState: ChatState = {
  status: 'idle',
  messages: [],
  toolCalls: [],
  surfaces: new Map(),
  agentState: undefined,
};

/**
 * Pure reducer: applies an AG-UI event to the chat state.
 *
 * The reducer returns the *same* reference if nothing changed, which
 * keeps `useSyncExternalStore` snapshots stable.
 */
export function reduce(state: ChatState, event: AgUiEvent): ChatState {
  switch (event.type) {
    case AG_UI_EVENT_TYPES.RUN_STARTED:
      return {
        ...state,
        status: 'running',
        runId: event.runId,
        error: undefined,
      };

    case AG_UI_EVENT_TYPES.RUN_FINISHED:
      return { ...state, status: 'finished' };

    case AG_UI_EVENT_TYPES.RUN_ERROR:
      return {
        ...state,
        status: 'error',
        error: { message: event.message, code: event.code },
      };

    case AG_UI_EVENT_TYPES.TEXT_MESSAGE_START: {
      const existing = state.messages.find((m) => m.id === event.messageId);
      if (existing) return state;
      const msg: ChatMessage = {
        id: event.messageId,
        role: event.role ?? 'assistant',
        text: '',
        done: false,
      };
      return { ...state, messages: [...state.messages, msg] };
    }

    case AG_UI_EVENT_TYPES.TEXT_MESSAGE_CONTENT: {
      const idx = state.messages.findIndex((m) => m.id === event.messageId);
      if (idx < 0) {
        // Auto-create message if CONTENT arrived without START.
        const msg: ChatMessage = {
          id: event.messageId,
          role: 'assistant',
          text: event.delta,
          done: false,
        };
        return { ...state, messages: [...state.messages, msg] };
      }
      const next = state.messages.slice();
      const prev = next[idx];
      if (!prev) return state;
      next[idx] = { ...prev, text: prev.text + event.delta };
      return { ...state, messages: next };
    }

    case AG_UI_EVENT_TYPES.TEXT_MESSAGE_END: {
      const idx = state.messages.findIndex((m) => m.id === event.messageId);
      if (idx < 0) return state;
      const next = state.messages.slice();
      const prev = next[idx];
      if (!prev || prev.done) return state;
      next[idx] = { ...prev, done: true };
      return { ...state, messages: next };
    }

    case AG_UI_EVENT_TYPES.TOOL_CALL_START: {
      const existing = state.toolCalls.find((t) => t.id === event.toolCallId);
      if (existing) return state;
      const call: ToolCall = {
        id: event.toolCallId,
        name: event.toolName,
        argsRaw: '',
        args: undefined,
        done: false,
        parentMessageId: event.parentMessageId,
      };
      return { ...state, toolCalls: [...state.toolCalls, call] };
    }

    case AG_UI_EVENT_TYPES.TOOL_CALL_ARGS: {
      const idx = state.toolCalls.findIndex((t) => t.id === event.toolCallId);
      if (idx < 0) {
        // Auto-create.
        const argsRaw = event.argsDelta;
        const call: ToolCall = {
          id: event.toolCallId,
          name: '',
          argsRaw,
          args: parsePartial(argsRaw),
          done: false,
        };
        return { ...state, toolCalls: [...state.toolCalls, call] };
      }
      const next = state.toolCalls.slice();
      const prev = next[idx];
      if (!prev) return state;
      const argsRaw = prev.argsRaw + event.argsDelta;
      next[idx] = { ...prev, argsRaw, args: parsePartial(argsRaw) };
      return { ...state, toolCalls: next };
    }

    case AG_UI_EVENT_TYPES.TOOL_CALL_END: {
      const idx = state.toolCalls.findIndex((t) => t.id === event.toolCallId);
      if (idx < 0) return state;
      const next = state.toolCalls.slice();
      const prev = next[idx];
      if (!prev || prev.done) return state;
      let finalArgs: unknown = prev.args;
      try {
        finalArgs = JSON.parse(prev.argsRaw) as unknown;
      } catch {
        /* keep best-effort partial */
      }
      next[idx] = { ...prev, done: true, args: finalArgs };
      return { ...state, toolCalls: next };
    }

    case AG_UI_EVENT_TYPES.STATE_SNAPSHOT:
      return { ...state, agentState: event.state };

    case AG_UI_EVENT_TYPES.STATE_DELTA:
      // We don't ship a JSON-patch implementation; consumers can wire one
      // in by listening to events directly. As a no-op fallback, ignore.
      return state;

    case AG_UI_EVENT_TYPES.UI_SURFACE_UPDATE: {
      const nextSurfaces = reduceSurfaces(state.surfaces, event);
      if (nextSurfaces === state.surfaces) return state;
      return { ...state, surfaces: nextSurfaces };
    }

    case AG_UI_EVENT_TYPES.CUSTOM:
      return state;

    default:
      return state;
  }
}
