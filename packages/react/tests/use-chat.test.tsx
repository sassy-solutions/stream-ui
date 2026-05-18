import { type ChatClient, createChatClient } from '@stream-ui/core';
import { act, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { useChat, useChatClient } from '../src/hooks/use-chat.js';
import { ChatProvider } from '../src/provider.js';

function makeFakeClient(): ChatClient & {
  emit: (e: Parameters<NonNullable<Parameters<typeof createChatClient>[0]['onEvent']>>[0]) => void;
} {
  type EventHandlers = NonNullable<
    Parameters<NonNullable<Parameters<typeof createChatClient>[0]['transport']>['connect']>[0]
  >;
  let handlers: EventHandlers | null = null;
  const client = createChatClient({
    transport: {
      async connect(h) {
        handlers = h;
        return {
          send: async () => undefined,
          close: () => undefined,
          closed: Promise.resolve(),
        };
      },
    },
  });
  void client.start();
  return Object.assign(client, {
    emit(e: Parameters<NonNullable<EventHandlers['onEvent']>>[0]) {
      handlers?.onEvent(e);
    },
  });
}

describe('useChat / ChatProvider', () => {
  it('returns initial state when no client is wired', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ChatProvider>{children}</ChatProvider>
    );
    const { result } = renderHook(() => useChat(), { wrapper });
    expect(result.current.status).toBe('idle');
    expect(result.current.messages).toEqual([]);
  });

  it('throws when used outside ChatProvider', () => {
    expect(() => renderHook(() => useChat())).toThrow(/ChatProvider/);
  });

  it('reactively re-renders on store update via a client', async () => {
    const client = makeFakeClient();
    // Wait for the transport connect to settle.
    await new Promise<void>((r) => setTimeout(r, 0));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ChatProvider client={client}>{children}</ChatProvider>
    );
    const { result } = renderHook(() => useChat((s) => s.messages), { wrapper });
    expect(result.current).toEqual([]);

    await act(async () => {
      client.emit({ type: 'TEXT_MESSAGE_START', messageId: 'm1' });
      client.emit({ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: 'hi' });
    });
    expect(result.current.map((m) => m.text)).toEqual(['hi']);
  });

  it('useChatClient returns the bound client', () => {
    const client = makeFakeClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ChatProvider client={client}>{children}</ChatProvider>
    );
    const { result } = renderHook(() => useChatClient(), { wrapper });
    expect(result.current).toBe(client);
  });

  it('useChatClient throws without a client', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ChatProvider>{children}</ChatProvider>
    );
    expect(() => renderHook(() => useChatClient(), { wrapper })).toThrow(
      /requires <ChatProvider client/,
    );
  });

  it('seeds initial state when provided', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ChatProvider initialState={{ status: 'running' }}>{children}</ChatProvider>
    );
    const { result } = renderHook(() => useChat((s) => s.status), { wrapper });
    expect(result.current).toBe('running');
  });

  it('renders <ChatProvider> children', () => {
    const { getByText } = render(
      <ChatProvider>
        <span>ok</span>
      </ChatProvider>,
    );
    expect(getByText('ok')).toBeTruthy();
  });
});
