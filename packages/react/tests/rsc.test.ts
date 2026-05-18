import type { AgUiEvent } from '@stream-ui/protocol';
/**
 * @vitest-environment node
 *
 * The RSC entry must work without DOM globals. This file is pinned to
 * the Node environment to assert no accidental jsdom dependency.
 */
import { describe, expect, it } from 'vitest';
import { collect, streamChatUI } from '../src/rsc/stream-ui.js';

async function* iterate<T>(items: T[]): AsyncIterable<T> {
  for (const i of items) yield i;
}

describe('streamChatUI', () => {
  it('emits seed render + one render per state-changing event', async () => {
    const events: AgUiEvent[] = [
      { type: 'RUN_STARTED', runId: 'r1' },
      { type: 'TEXT_MESSAGE_START', messageId: 'm1' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: 'hi' },
      { type: 'TEXT_MESSAGE_END', messageId: 'm1' },
      { type: 'RUN_FINISHED', runId: 'r1' },
    ];
    const renders: string[] = [];
    const out = await collect(
      streamChatUI(iterate(events), (state) => {
        renders.push(`${state.status}:${state.messages.map((m) => m.text).join(',')}`);
        return null;
      }),
    );
    // 1 seed + 5 events = 6 renders.
    expect(out).toHaveLength(6);
    expect(renders).toEqual([
      'idle:',
      'running:',
      'running:',
      'running:hi',
      'running:hi',
      'finished:hi',
    ]);
  });

  it('dedupes when an event leaves state unchanged', async () => {
    const events: AgUiEvent[] = [
      { type: 'CUSTOM', name: 'noop', payload: null },
      { type: 'CUSTOM', name: 'noop', payload: null },
    ];
    const out = await collect(streamChatUI(iterate(events), () => null));
    expect(out).toHaveLength(1); // only the seed render
  });

  it('respects dedupe=false', async () => {
    const events: AgUiEvent[] = [
      { type: 'CUSTOM', name: 'noop', payload: null },
      { type: 'CUSTOM', name: 'noop', payload: null },
    ];
    const out = await collect(streamChatUI(iterate(events), () => null, { dedupe: false }));
    expect(out).toHaveLength(3);
  });

  it('honors initialState seed', async () => {
    const out: string[] = [];
    await collect(
      streamChatUI(
        iterate([]),
        (state) => {
          out.push(state.status);
          return null;
        },
        { initialState: { status: 'running' } },
      ),
    );
    expect(out).toEqual(['running']);
  });
});
