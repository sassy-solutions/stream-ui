import type { ChatMessage, ChatState } from '@stream-ui/core';
import { useChat } from './use-chat.js';

export interface StreamStatus {
  /** True while at least one segment of the path is actively streaming. */
  streaming: boolean;
  /** True once every referenced segment has terminated. */
  complete: boolean;
}

/**
 * Per-message / per-field token-streaming status.
 *
 * The `path` is interpreted as a dot-separated reference into the chat
 * state — supported shapes:
 *
 *   - `"message:<messageId>"` — true while a TEXT_MESSAGE_END for the
 *     id has not yet been seen.
 *   - `"tool:<toolCallId>"` — analogous for tool calls.
 *   - `"<messageId>"` / `"<toolCallId>"` — auto-detected.
 *
 * Designed so consumers can show "typing…" or skeleton loaders without
 * subscribing to the full ChatState.
 */
export function useStreamStatus(path: string): StreamStatus {
  return useChat((state) => computeStatus(state, path));
}

function computeStatus(state: ChatState, path: string): StreamStatus {
  let kind: 'message' | 'tool' | 'auto' = 'auto';
  let id = path;
  if (path.startsWith('message:')) {
    kind = 'message';
    id = path.slice('message:'.length);
  } else if (path.startsWith('tool:')) {
    kind = 'tool';
    id = path.slice('tool:'.length);
  }

  if (kind === 'message' || kind === 'auto') {
    const msg = state.messages.find((m: ChatMessage) => m.id === id);
    if (msg) {
      return { streaming: !msg.done, complete: msg.done };
    }
  }
  if (kind === 'tool' || kind === 'auto') {
    const tool = state.toolCalls.find((t) => t.id === id);
    if (tool) {
      return { streaming: !tool.done, complete: tool.done };
    }
  }
  return { streaming: false, complete: false };
}
