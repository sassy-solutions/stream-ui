import { type ChatState, initialChatState } from '@stream-ui/core';
import type { FormSpec, Surface } from '@stream-ui/protocol';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFormFromMessage } from '../src/hooks/use-form-from-message.js';
import { ChatProvider } from '../src/provider.js';

const formSpec: FormSpec = {
  id: 'order',
  fields: [{ name: 'qty', kind: 'integer' }],
  submit: { target: 'tool:order' },
};

function surfaceWith(id: string, spec: FormSpec): Surface {
  return {
    version: '0.9',
    id,
    state: {},
    root: {
      id: 'root',
      kind: 'form',
      props: { spec },
    },
  } as Surface;
}

describe('useFormFromMessage', () => {
  it('returns null when no surface is bound to the message', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ChatProvider>{children}</ChatProvider>
    );
    const { result } = renderHook(() => useFormFromMessage('m1'), { wrapper });
    expect(result.current).toBeNull();
  });

  it('returns a memoized FormEngine when a surface matches the messageId', () => {
    const surfaces = new Map([['m1', surfaceWith('m1', formSpec)]]);
    const initialState: Partial<ChatState> = { ...initialChatState, surfaces };
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ChatProvider initialState={initialState}>{children}</ChatProvider>
    );
    const { result, rerender } = renderHook(() => useFormFromMessage('m1'), { wrapper });
    expect(result.current).not.toBeNull();
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('honors selectFormSpec override', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ChatProvider>{children}</ChatProvider>
    );
    const { result } = renderHook(
      () =>
        useFormFromMessage('any', {
          selectFormSpec: () => formSpec,
        }),
      { wrapper },
    );
    expect(result.current?.store.getSnapshot().status).toBe('idle');
  });
});
