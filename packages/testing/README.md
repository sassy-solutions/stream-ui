# @stream-ui/testing

Mocks, AG-UI fixtures, and React Testing Library helpers for testing
[`@stream-ui`](https://github.com/sassy-solutions/stream-ui) consumers
without standing up a real AG-UI server.

## Install

```bash
pnpm add -D @stream-ui/testing
# optional, only needed for renderWithChat()
pnpm add -D @testing-library/react @stream-ui/react react react-dom
```

## Mock transport

`createMockTransport` returns a `Transport` you can hand to
`createChatClient` (or any hook that wraps it). The script is replayed
in order; `delayMs` controls the pacing.

```ts
import { createChatClient } from '@stream-ui/core';
import { agUiTextStreamFixture, createMockTransport } from '@stream-ui/testing';

const transport = createMockTransport({
  script: agUiTextStreamFixture('Hello!'),
  delayMs: 10,
});
const client = createChatClient({ transport });
await client.start();
```

Pair with vitest fake timers for deterministic stepping:

```ts
vi.useFakeTimers();
await vi.advanceTimersByTimeAsync(10); // next token
transport.pause();                       // freeze
transport.resume();
transport.flushAll();                    // fast-forward + close
```

## Less-than-10-line `useChat` test

```ts
import { describe, expect, it, vi } from 'vitest';
import { renderWithChat, agUiTextStreamFixture } from '@stream-ui/testing/react';
import { screen } from '@testing-library/react';
import { ChatTranscript } from './ChatTranscript';

it('streams the assistant reply', async () => {
  vi.useFakeTimers();
  const { transport } = await renderWithChat(<ChatTranscript />, {
    script: agUiTextStreamFixture('Bonjour!'),
  });
  (transport as any).flushAll();
  expect(await screen.findByText('Bonjour!')).toBeInTheDocument();
});
```

## Fixtures

- `agUiTextStreamFixture(text, opts)` — chunked text stream with optional
  RUN framing.
- `agUiToolCallFixture(name, args, opts)` — chunked TOOL_CALL_ARGS frames.
- `agUiFormFixture(formSpec)` / `agUiPartialFormFixture(formSpec)` —
  UI_SURFACE_UPDATE events for a FormSpec.
- `agUiErrorFixture(message, opts)` — RUN_STARTED → RUN_ERROR.
- `a2uiFormFixtures.{checkout,contact,signup}` — realistic FormSpec
  examples with mixed field types.

## Peer dependencies

`@testing-library/react`, `@stream-ui/react`, `react`, `react-dom`, and
`vitest` are **optional peer dependencies**. The main entry is
React-free; `renderWithChat` lives at `@stream-ui/testing/react` and
resolves these deps lazily so the package installs cleanly even when the
React side hasn't been built yet.
