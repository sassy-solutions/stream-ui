import type { AgUiEvent } from '@stream-ui/protocol';
import { describe, expect, it, vi } from 'vitest';
import { createChatClient } from '../src/client.js';
import type { Transport, TransportConnection } from '../src/transport/index.js';

function makeTransport(events: AgUiEvent[]): Transport & { sendSpy: ReturnType<typeof vi.fn> } {
  const sendSpy = vi.fn();
  let closeCb: () => void = () => {};
  const transport: Transport = {
    async connect({ onEvent }) {
      for (const ev of events) onEvent(ev);
      const closed = new Promise<void>((resolve) => {
        closeCb = resolve;
      });
      const conn: TransportConnection = {
        async send(p) {
          sendSpy(p);
        },
        close() {
          closeCb();
        },
        closed,
      };
      return conn;
    },
  };
  return Object.assign(transport, { sendSpy });
}

describe('createChatClient', () => {
  it('start opens transport and folds events into the store', async () => {
    const transport = makeTransport([
      { type: 'RUN_STARTED', runId: 'r1' },
      { type: 'TEXT_MESSAGE_START', messageId: 'm1' },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: 'hi' },
      { type: 'TEXT_MESSAGE_END', messageId: 'm1' },
    ]);
    const client = createChatClient({ transport });
    await client.start();
    const s = client.store.getSnapshot();
    expect(s.status).toBe('running');
    expect(s.messages[0]!.text).toBe('hi');
    await client.dispose();
  });

  it('send opens transport lazily and forwards payload', async () => {
    const transport = makeTransport([]);
    const client = createChatClient({ transport });
    await client.send({ ask: 'hello' });
    expect(transport.sendSpy).toHaveBeenCalledWith({ ask: 'hello' });
    await client.dispose();
  });

  it('seeds initial state', () => {
    const transport = makeTransport([]);
    const client = createChatClient({
      transport,
      initialState: { status: 'finished', runId: 'r0' },
    });
    expect(client.store.getSnapshot().runId).toBe('r0');
    expect(client.store.getSnapshot().status).toBe('finished');
  });

  it('rejects send after dispose', async () => {
    const transport = makeTransport([]);
    const client = createChatClient({ transport });
    await client.dispose();
    await expect(client.send({})).rejects.toThrow(/disposed/);
  });

  it('forwards onEvent hook', async () => {
    const seen: AgUiEvent[] = [];
    const transport = makeTransport([{ type: 'RUN_STARTED', runId: 'r1' }]);
    const client = createChatClient({ transport, onEvent: (e) => seen.push(e) });
    await client.start();
    expect(seen).toHaveLength(1);
    await client.dispose();
  });
});
