import { createChatClient } from '@stream-ui/core';
import {
  agUiFormFixture,
  agUiTextStreamFixture,
  checkoutFormSpec,
  createMockTransport,
} from '@stream-ui/testing';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './app.js';

describe('example-web smoke', () => {
  it('renders the composer', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask me to start a checkout/i)).toBeTruthy();
    });
  });

  it('streams a checkout form surface through a mock transport', async () => {
    const transport = createMockTransport({
      script: [
        ...agUiTextStreamFixture('hi', { chunkSize: 1, withRunFraming: false }),
        ...agUiFormFixture(checkoutFormSpec, { withRunFraming: false }),
      ],
      delayMs: 0,
    });
    const client = createChatClient({ transport });
    await client.start();
    await transport.drained;
    const state = client.store.getSnapshot();
    expect(state.messages.length).toBeGreaterThan(0);
    const surface = state.surfaces.get('surface-1');
    expect(surface).toBeTruthy();
    const spec = (surface?.root.props as { spec?: { id?: string } } | undefined)?.spec;
    expect(spec?.id).toBe('checkout');
    await client.dispose();
  });
});
