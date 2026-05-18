import type { AgUiEvent } from '@stream-ui/protocol';
import { describe, expect, it, vi } from 'vitest';
import { createSseTransport, drainFrames, parseSseFrame } from '../src/transport/sse.js';

describe('parseSseFrame', () => {
  it('parses a single data line', () => {
    const f = parseSseFrame('data: hello');
    expect(f).toEqual({ event: undefined, data: 'hello', id: undefined });
  });

  it('concatenates multiple data lines with newlines', () => {
    const f = parseSseFrame('data: line1\ndata: line2');
    expect(f?.data).toBe('line1\nline2');
  });

  it('parses event + id fields', () => {
    const f = parseSseFrame('event: foo\nid: 7\ndata: hi');
    expect(f).toEqual({ event: 'foo', data: 'hi', id: '7' });
  });

  it('ignores comments', () => {
    const f = parseSseFrame(': this is a comment\ndata: x');
    expect(f?.data).toBe('x');
  });

  it('returns null when no data field present', () => {
    expect(parseSseFrame('event: ping')).toBeNull();
  });

  it('handles field with no space after colon', () => {
    expect(parseSseFrame('data:x')?.data).toBe('x');
  });
});

describe('drainFrames', () => {
  it('emits events for complete frames and keeps remainder', () => {
    const events: AgUiEvent[] = [];
    const buf =
      'data: {"type":"RUN_STARTED","runId":"r1"}\n\ndata: {"type":"TEXT_MESSAGE_START","messageId"';
    const rest = drainFrames(buf, (e) => events.push(e));
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('RUN_STARTED');
    expect(rest).toContain('TEXT_MESSAGE_START');
  });

  it('ignores [DONE] sentinel', () => {
    const events: AgUiEvent[] = [];
    const buf = 'data: [DONE]\n\n';
    drainFrames(buf, (e) => events.push(e));
    expect(events).toHaveLength(0);
  });

  it('routes parse errors to onError', () => {
    const errors: Error[] = [];
    const events: AgUiEvent[] = [];
    drainFrames(
      'data: {not json\n\n',
      (e) => events.push(e),
      (err) => errors.push(err),
    );
    expect(events).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('handles CRLF line endings', () => {
    const events: AgUiEvent[] = [];
    drainFrames('data: {"type":"RUN_FINISHED","runId":"r1"}\r\n\r\n', (e) => events.push(e));
    expect(events[0]?.type).toBe('RUN_FINISHED');
  });
});

describe('createSseTransport — integration with fake fetch', () => {
  it('streams events from a ReadableStream body', async () => {
    const events: AgUiEvent[] = [];
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"RUN_STARTED","runId":"r1"}\n\n'));
        controller.enqueue(
          encoder.encode('data: {"type":"TEXT_MESSAGE_START","messageId":"m1"}\n\n'),
        );
        controller.enqueue(encoder.encode('data: {"type":"RUN_FINISHED","runId":"r1"}\n\n'));
        controller.close();
      },
    });

    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body,
    });

    const transport = createSseTransport({
      url: 'http://example/stream',
      fetch: fakeFetch as unknown as typeof fetch,
    });

    const conn = await transport.connect({ onEvent: (e) => events.push(e) });
    await conn.closed;
    expect(events.map((e) => e.type)).toEqual([
      'RUN_STARTED',
      'TEXT_MESSAGE_START',
      'RUN_FINISHED',
    ]);
  });

  it('throws on non-ok response', async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const transport = createSseTransport({
      url: 'http://example/stream',
      fetch: fakeFetch as unknown as typeof fetch,
    });
    await expect(transport.connect({ onEvent: () => {} })).rejects.toThrow(/HTTP 500/);
  });

  it('send POSTs payload to sendUrl', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"RUN_STARTED","runId":"r1"}\n\n'));
        controller.close();
      },
    });
    const fakeFetch = vi.fn(async (url: string, _init: RequestInit) => {
      if (url.endsWith('/stream')) return { ok: true, status: 200, body } as Response;
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(0),
      } as unknown as Response;
    });
    const transport = createSseTransport({
      url: 'http://example/stream',
      fetch: fakeFetch as unknown as typeof fetch,
    });
    const conn = await transport.connect({ onEvent: () => {} });
    await conn.send({ ping: true });
    expect(fakeFetch).toHaveBeenCalledTimes(2);
    expect((fakeFetch.mock.calls[1]?.[1] as RequestInit | undefined)?.body).toBe(
      JSON.stringify({ ping: true }),
    );
  });
});
