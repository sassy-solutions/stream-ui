import type { AgUiEvent } from '@stream-ui/protocol';
import { describe, expect, it } from 'vitest';
import { initialChatState, reduce } from '../src/state/reducer.js';

describe('reduce', () => {
  it('marks run started', () => {
    const next = reduce(initialChatState, {
      type: 'RUN_STARTED',
      runId: 'r1',
    });
    expect(next.status).toBe('running');
    expect(next.runId).toBe('r1');
  });

  it('marks run finished', () => {
    const s1 = reduce(initialChatState, { type: 'RUN_STARTED', runId: 'r1' });
    const s2 = reduce(s1, { type: 'RUN_FINISHED', runId: 'r1' });
    expect(s2.status).toBe('finished');
  });

  it('captures run error', () => {
    const s = reduce(initialChatState, {
      type: 'RUN_ERROR',
      runId: 'r1',
      message: 'boom',
      code: 'E_FOO',
    });
    expect(s.status).toBe('error');
    expect(s.error).toEqual({ message: 'boom', code: 'E_FOO' });
  });

  it('builds a streaming text message', () => {
    let s = reduce(initialChatState, { type: 'TEXT_MESSAGE_START', messageId: 'm1' });
    s = reduce(s, { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: 'Hel' });
    s = reduce(s, { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: 'lo!' });
    s = reduce(s, { type: 'TEXT_MESSAGE_END', messageId: 'm1' });
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]!.text).toBe('Hello!');
    expect(s.messages[0]!.done).toBe(true);
  });

  it('ignores duplicate TEXT_MESSAGE_START', () => {
    const s = reduce(initialChatState, { type: 'TEXT_MESSAGE_START', messageId: 'm1' });
    const dup = reduce(s, { type: 'TEXT_MESSAGE_START', messageId: 'm1' });
    expect(dup).toBe(s);
  });

  it('auto-creates message when CONTENT arrives without START', () => {
    const s = reduce(initialChatState, {
      type: 'TEXT_MESSAGE_CONTENT',
      messageId: 'm1',
      delta: 'hi',
    });
    expect(s.messages[0]!.text).toBe('hi');
  });

  it('TEXT_MESSAGE_END for unknown id is a no-op', () => {
    const s = reduce(initialChatState, { type: 'TEXT_MESSAGE_END', messageId: 'unknown' });
    expect(s).toBe(initialChatState);
  });

  it('accumulates tool call args and parses them incrementally', () => {
    let s = reduce(initialChatState, {
      type: 'TOOL_CALL_START',
      toolCallId: 't1',
      toolName: 'search',
    });
    s = reduce(s, {
      type: 'TOOL_CALL_ARGS',
      toolCallId: 't1',
      argsDelta: '{"q":"par',
    });
    expect(s.toolCalls[0]!.args).toEqual({});
    s = reduce(s, {
      type: 'TOOL_CALL_ARGS',
      toolCallId: 't1',
      argsDelta: 'is"}',
    });
    expect(s.toolCalls[0]!.args).toEqual({ q: 'paris' });
    s = reduce(s, { type: 'TOOL_CALL_END', toolCallId: 't1' });
    expect(s.toolCalls[0]!.done).toBe(true);
    expect(s.toolCalls[0]!.args).toEqual({ q: 'paris' });
  });

  it('TOOL_CALL_ARGS without START auto-creates', () => {
    const s = reduce(initialChatState, {
      type: 'TOOL_CALL_ARGS',
      toolCallId: 't1',
      argsDelta: '{"x":1}',
    });
    expect(s.toolCalls[0]!.args).toEqual({ x: 1 });
  });

  it('TOOL_CALL_END for unknown id is a no-op', () => {
    const s = reduce(initialChatState, { type: 'TOOL_CALL_END', toolCallId: 'nope' });
    expect(s).toBe(initialChatState);
  });

  it('STATE_SNAPSHOT replaces agentState', () => {
    const s = reduce(initialChatState, { type: 'STATE_SNAPSHOT', state: { foo: 'bar' } });
    expect(s.agentState).toEqual({ foo: 'bar' });
  });

  it('STATE_DELTA is a no-op (host wires patcher)', () => {
    const s = reduce(initialChatState, {
      type: 'STATE_DELTA',
      patch: [{ op: 'add', path: '/x', value: 1 }],
    });
    expect(s).toBe(initialChatState);
  });

  it('UI_SURFACE_UPDATE adds a surface', () => {
    const s = reduce(initialChatState, {
      type: 'UI_SURFACE_UPDATE',
      surfaceId: 's1',
      surface: {
        version: '0.9',
        id: 's1',
        root: { id: 'r', kind: 'container' },
      },
    });
    expect(s.surfaces.get('s1')?.id).toBe('s1');
  });

  it('CUSTOM events are no-ops', () => {
    const s = reduce(initialChatState, {
      type: 'CUSTOM',
      name: 'foo',
      payload: { a: 1 },
    });
    expect(s).toBe(initialChatState);
  });

  it('unknown event type is a no-op', () => {
    const s = reduce(initialChatState, { type: 'UNKNOWN' } as unknown as AgUiEvent);
    expect(s).toBe(initialChatState);
  });
});
