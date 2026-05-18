import { createChatClient } from '@stream-ui/core';
import { AG_UI_EVENT_TYPES, type AgUiEvent, type FormSpec } from '@stream-ui/protocol';
import { describe, expect, it, vi } from 'vitest';
import {
  a2uiFormFixtures,
  agUiErrorFixture,
  agUiFormFixture,
  agUiPartialFormFixture,
  agUiTextStreamFixture,
  agUiToolCallFixture,
  checkoutFormSpec,
  contactFormSpec,
  createMockTransport,
  signupFormSpec,
} from '../src/index.js';

const isAgUiEvent = (v: unknown): v is AgUiEvent =>
  typeof v === 'object' && v !== null && typeof (v as { type?: unknown }).type === 'string';

describe('agUiTextStreamFixture', () => {
  it('emits framing + chunked content', () => {
    const events = agUiTextStreamFixture('Hello world!', { chunkSize: 3 });
    expect(events.every(isAgUiEvent)).toBe(true);
    expect(events[0]?.type).toBe(AG_UI_EVENT_TYPES.RUN_STARTED);
    expect(events.at(-1)?.type).toBe(AG_UI_EVENT_TYPES.RUN_FINISHED);
    const content = events.filter((e) => e.type === AG_UI_EVENT_TYPES.TEXT_MESSAGE_CONTENT);
    expect(content).toHaveLength(Math.ceil('Hello world!'.length / 3));
    expect(content.map((e) => (e as { delta: string }).delta).join('')).toBe('Hello world!');
  });

  it('respects withRunFraming=false', () => {
    const events = agUiTextStreamFixture('hi', { withRunFraming: false });
    expect(events[0]?.type).toBe(AG_UI_EVENT_TYPES.TEXT_MESSAGE_START);
    expect(events.at(-1)?.type).toBe(AG_UI_EVENT_TYPES.TEXT_MESSAGE_END);
  });
});

describe('agUiToolCallFixture', () => {
  it('chunks JSON-stringified args across TOOL_CALL_ARGS', () => {
    const args = { city: 'Paris', units: 'metric' };
    const events = agUiToolCallFixture('getWeather', args, { chunkSize: 5 });
    expect(events[0]?.type).toBe(AG_UI_EVENT_TYPES.RUN_STARTED);
    const start = events.find((e) => e.type === AG_UI_EVENT_TYPES.TOOL_CALL_START);
    expect(start).toBeTruthy();
    const argsFrames = events.filter((e) => e.type === AG_UI_EVENT_TYPES.TOOL_CALL_ARGS);
    const joined = argsFrames.map((e) => (e as { argsDelta: string }).argsDelta).join('');
    expect(JSON.parse(joined)).toEqual(args);
  });
});

describe('agUiFormFixture', () => {
  it('wraps a FormSpec in a UI_SURFACE_UPDATE', () => {
    const events = agUiFormFixture(contactFormSpec);
    const surfaceEvent = events.find((e) => e.type === AG_UI_EVENT_TYPES.UI_SURFACE_UPDATE) as
      | { surface?: { root?: { kind?: string; props?: { spec?: FormSpec } } } }
      | undefined;
    expect(surfaceEvent?.surface?.root?.kind).toBe('form');
    expect(surfaceEvent?.surface?.root?.props?.spec?.id).toBe('contact');
  });
});

describe('agUiPartialFormFixture', () => {
  it('emits a shell followed by a fields patch', () => {
    const events = agUiPartialFormFixture(checkoutFormSpec);
    const updates = events.filter((e) => e.type === AG_UI_EVENT_TYPES.UI_SURFACE_UPDATE);
    expect(updates).toHaveLength(2);
    expect((updates[0] as { surface?: unknown }).surface).toBeTruthy();
    expect((updates[1] as { patch?: unknown }).patch).toBeTruthy();
  });
});

describe('agUiErrorFixture', () => {
  it('emits RUN_STARTED + RUN_ERROR', () => {
    const events = agUiErrorFixture('boom', { code: 'E_TIMEOUT' });
    expect(events.map((e) => e.type)).toEqual([
      AG_UI_EVENT_TYPES.RUN_STARTED,
      AG_UI_EVENT_TYPES.RUN_ERROR,
    ]);
    expect((events[1] as { message: string }).message).toBe('boom');
  });
});

describe('a2uiFormFixtures', () => {
  it('exposes the three named fixtures', () => {
    expect(a2uiFormFixtures.checkout).toBe(checkoutFormSpec);
    expect(a2uiFormFixtures.contact).toBe(contactFormSpec);
    expect(a2uiFormFixtures.signup).toBe(signupFormSpec);
  });

  it.each(Object.entries(a2uiFormFixtures))(
    'fixture %s has required FormSpec fields',
    (_name, spec) => {
      expect(typeof spec.id).toBe('string');
      expect(Array.isArray(spec.fields)).toBe(true);
      expect(spec.fields.length).toBeGreaterThan(0);
      expect(typeof spec.submit.target).toBe('string');
      for (const field of spec.fields) {
        expect(typeof field.name).toBe('string');
        expect(typeof field.kind).toBe('string');
      }
    },
  );
});

describe('end-to-end: chat client + mock transport + text fixture', () => {
  it('drives the chat state machine to a finished message', async () => {
    vi.useFakeTimers();
    try {
      const transport = createMockTransport({
        script: agUiTextStreamFixture('Bonjour!', { chunkSize: 2 }),
      });
      const client = createChatClient({ transport });
      await client.start();
      await vi.runAllTimersAsync();
      await client.dispose();
      const state = client.store.getSnapshot();
      expect(state.status).toBe('finished');
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]?.text).toBe('Bonjour!');
      expect(state.messages[0]?.done).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
