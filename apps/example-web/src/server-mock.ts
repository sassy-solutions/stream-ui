import type { AgUiEvent } from '@stream-ui/protocol';
import { agUiFormFixture, agUiTextStreamFixture, checkoutFormSpec } from '@stream-ui/testing';
import type { Plugin } from 'vite';

/**
 * Vite dev-server plugin: intercept `POST /chat` and stream a scripted
 * AG-UI SSE response. Lets the demo use the real `createSseTransport`
 * against a tiny fake agent — no real LLM required.
 *
 * Token cadence is deliberately slow (60–140ms) so the streaming UX is
 * easy to see in the browser.
 */
export function agUiMockPlugin(): Plugin {
  return {
    name: 'stream-ui-ag-ui-mock',
    configureServer(server) {
      server.middlewares.use('/chat', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        await readBody(req).catch(() => undefined);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders?.();

        const runId = `run-${Date.now()}`;
        const messageId = `msg-${Date.now()}`;
        const surfaceId = messageId;

        const intro = agUiTextStreamFixture('Sure — fill this out and I will place the order:', {
          runId,
          messageId,
          chunkSize: 3,
          withRunFraming: false,
        });
        const form = agUiFormFixture(checkoutFormSpec, {
          runId,
          surfaceId,
          withRunFraming: false,
        });

        const script: AgUiEvent[] = [
          { type: 'RUN_STARTED', runId },
          ...intro,
          ...form,
          { type: 'RUN_FINISHED', runId, reason: 'stop' },
        ];

        let cancelled = false;
        req.on('close', () => {
          cancelled = true;
        });

        for (let i = 0; i < script.length; i += 1) {
          if (cancelled) return;
          const event = script[i];
          if (!event) continue;
          res.write(`event: ${event.type}\n`);
          res.write(`data: ${JSON.stringify(event)}\n\n`);
          await sleep(delayFor(event));
        }
        res.end();
      });
    },
  };
}

function delayFor(event: AgUiEvent): number {
  switch (event.type) {
    case 'TEXT_MESSAGE_CONTENT':
      return 60 + Math.floor(Math.random() * 80);
    case 'UI_SURFACE_UPDATE':
      return 140;
    case 'RUN_STARTED':
    case 'TEXT_MESSAGE_START':
    case 'TEXT_MESSAGE_END':
      return 40;
    default:
      return 20;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
