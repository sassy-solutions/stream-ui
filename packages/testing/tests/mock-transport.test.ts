import type { AgUiEvent } from '@stream-ui/protocol';
import { AG_UI_EVENT_TYPES } from '@stream-ui/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockTransport } from '../src/mock-transport.js';

const script: AgUiEvent[] = [
  { type: AG_UI_EVENT_TYPES.RUN_STARTED, runId: 'r' },
  { type: AG_UI_EVENT_TYPES.TEXT_MESSAGE_START, messageId: 'm', runId: 'r' },
  { type: AG_UI_EVENT_TYPES.TEXT_MESSAGE_CONTENT, messageId: 'm', delta: 'hi', runId: 'r' },
  { type: AG_UI_EVENT_TYPES.TEXT_MESSAGE_END, messageId: 'm', runId: 'r' },
  { type: AG_UI_EVENT_TYPES.RUN_FINISHED, runId: 'r' },
];

describe('createMockTransport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('replays the script in order with zero delay', async () => {
    const onEvent = vi.fn();
    const transport = createMockTransport({ script });
    const conn = await transport.connect({ onEvent });
    // Drain microtasks + zero-delay timers.
    await vi.runAllTimersAsync();
    await conn.closed;
    expect(onEvent.mock.calls.map((c) => (c[0] as AgUiEvent).type)).toEqual(
      script.map((e) => e.type),
    );
  });

  it('honours constant delayMs between events', async () => {
    const onEvent = vi.fn();
    const transport = createMockTransport({ script, delayMs: 100 });
    await transport.connect({ onEvent });
    expect(onEvent).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(99);
    expect(onEvent).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(onEvent).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(400);
    expect(onEvent).toHaveBeenCalledTimes(5);
  });

  it('supports per-event delay functions', async () => {
    const onEvent = vi.fn();
    const transport = createMockTransport({
      script,
      delayMs: (evt) => (evt.type === AG_UI_EVENT_TYPES.TEXT_MESSAGE_CONTENT ? 50 : 10),
    });
    await transport.connect({ onEvent });
    await vi.advanceTimersByTimeAsync(10); // RUN_STARTED fires
    expect(onEvent).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10); // TEXT_MESSAGE_START
    expect(onEvent).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(49);
    expect(onEvent).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1); // TEXT_MESSAGE_CONTENT after 50ms
    expect(onEvent).toHaveBeenCalledTimes(3);
  });

  it('pause/resume halts emission', async () => {
    const onEvent = vi.fn();
    const transport = createMockTransport({ script, delayMs: 10 });
    await transport.connect({ onEvent });
    await vi.advanceTimersByTimeAsync(10);
    expect(onEvent).toHaveBeenCalledTimes(1);
    transport.pause();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onEvent).toHaveBeenCalledTimes(1);
    transport.resume();
    await vi.runAllTimersAsync();
    expect(onEvent).toHaveBeenCalledTimes(script.length);
  });

  it('autoStart=false defers playback until resume()', async () => {
    const onEvent = vi.fn();
    const transport = createMockTransport({ script, delayMs: 5, autoStart: false });
    await transport.connect({ onEvent });
    await vi.advanceTimersByTimeAsync(100);
    expect(onEvent).not.toHaveBeenCalled();
    transport.resume();
    await vi.runAllTimersAsync();
    expect(onEvent).toHaveBeenCalledTimes(script.length);
  });

  it('flushAll synchronously emits remaining events', async () => {
    const onEvent = vi.fn();
    const transport = createMockTransport({ script, delayMs: 1000 });
    const conn = await transport.connect({ onEvent });
    transport.flushAll();
    expect(onEvent).toHaveBeenCalledTimes(script.length);
    await conn.closed;
    await expect(transport.drained).resolves.toBeUndefined();
  });

  it('records send() payloads', async () => {
    const transport = createMockTransport({ script: [] });
    const conn = await transport.connect({ onEvent: () => {} });
    await conn.send({ kind: 'user', text: 'hi' });
    await conn.send('raw');
    expect(transport.sent).toEqual([{ kind: 'user', text: 'hi' }, 'raw']);
  });

  it('aborts when the signal fires', async () => {
    const onEvent = vi.fn();
    const ctrl = new AbortController();
    const transport = createMockTransport({ script, delayMs: 10 });
    const conn = await transport.connect({ onEvent, signal: ctrl.signal });
    await vi.advanceTimersByTimeAsync(10);
    expect(onEvent).toHaveBeenCalledTimes(1);
    ctrl.abort();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onEvent).toHaveBeenCalledTimes(1);
    await conn.closed;
  });

  it('finishes immediately when the signal is already aborted', async () => {
    const onEvent = vi.fn();
    const ctrl = new AbortController();
    ctrl.abort();
    const transport = createMockTransport({ script, delayMs: 0 });
    const conn = await transport.connect({ onEvent, signal: ctrl.signal });
    await vi.runAllTimersAsync();
    expect(onEvent).not.toHaveBeenCalled();
    await conn.closed;
  });

  it('close() resolves drained and is idempotent', async () => {
    const transport = createMockTransport({ script, delayMs: 1000 });
    const conn = await transport.connect({ onEvent: () => {} });
    conn.close();
    conn.close(); // second call is a no-op
    await expect(transport.drained).resolves.toBeUndefined();
  });

  it('swallows consumer errors thrown from onEvent', async () => {
    const onEvent = vi.fn(() => {
      throw new Error('consumer boom');
    });
    const transport = createMockTransport({ script, delayMs: 0 });
    const conn = await transport.connect({ onEvent });
    await vi.runAllTimersAsync();
    expect(onEvent).toHaveBeenCalledTimes(script.length);
    await conn.closed;
  });

  it('runs the full bookended flow when paired with a real chat client', async () => {
    const { createChatClient } = await import('@stream-ui/core');
    const transport = createMockTransport({ script });
    const client = createChatClient({ transport });
    await client.start();
    await vi.runAllTimersAsync();
    await client.dispose();
    expect(client.store.getSnapshot().status).toBe('finished');
    expect(client.store.getSnapshot().messages).toHaveLength(1);
    expect(client.store.getSnapshot().messages[0]?.text).toBe('hi');
  });
});
