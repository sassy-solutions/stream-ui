import type { ChatState } from '@stream-ui/core';
import { initialChatState } from '@stream-ui/core';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useStreamStatus } from '../src/hooks/use-stream-status.js';
import { ChatProvider } from '../src/provider.js';

function wrapper(state: Partial<ChatState>) {
  return ({ children }: { children: React.ReactNode }) => (
    <ChatProvider initialState={state}>{children}</ChatProvider>
  );
}

describe('useStreamStatus', () => {
  it('reports streaming=true while message is open', () => {
    const { result } = renderHook(() => useStreamStatus('m1'), {
      wrapper: wrapper({
        ...initialChatState,
        messages: [{ id: 'm1', role: 'assistant', text: 'partial', done: false }],
      }),
    });
    expect(result.current).toEqual({ streaming: true, complete: false });
  });

  it('reports complete=true after TEXT_MESSAGE_END', () => {
    const { result } = renderHook(() => useStreamStatus('message:m1'), {
      wrapper: wrapper({
        ...initialChatState,
        messages: [{ id: 'm1', role: 'assistant', text: 'done', done: true }],
      }),
    });
    expect(result.current).toEqual({ streaming: false, complete: true });
  });

  it('looks up tool calls under the tool: prefix', () => {
    const { result } = renderHook(() => useStreamStatus('tool:t1'), {
      wrapper: wrapper({
        ...initialChatState,
        toolCalls: [{ id: 't1', name: 'x', argsRaw: '', args: undefined, done: false }],
      }),
    });
    expect(result.current.streaming).toBe(true);
  });

  it('returns inert status for unknown ids', () => {
    const { result } = renderHook(() => useStreamStatus('missing'), {
      wrapper: wrapper({}),
    });
    expect(result.current).toEqual({ streaming: false, complete: false });
  });
});
