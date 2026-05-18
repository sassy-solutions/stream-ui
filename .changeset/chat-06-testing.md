---
'@stream-ui/testing': minor
---

[CHAT 06 — TESTING] Initial implementation of `@stream-ui/testing`:

- `createMockTransport({ script, delayMs?, autoStart? })` — in-memory
  `Transport` that replays a scripted list of AG-UI events. Supports
  constant or per-event `delayMs`, `pause()` / `resume()`, `flushAll()`
  for synchronous drains, a `drained` promise, and a `sent` log of every
  `send()` payload. Plays nicely with vitest fake timers for
  deterministic stepping.
- AG-UI fixture builders:
  - `agUiTextStreamFixture(text, { chunkSize?, withRunFraming? })`
  - `agUiToolCallFixture(name, args, { chunkSize? })`
  - `agUiFormFixture(formSpec)` + `agUiPartialFormFixture(formSpec)`
  - `agUiErrorFixture(message, { code? })`
- A2UI form fixtures: `checkoutFormSpec`, `contactFormSpec`,
  `signupFormSpec`, plus the `a2uiFormFixtures` map keyed by name.
- Optional RTL helper at `@stream-ui/testing/react`: `renderWithChat(ui,
  { transport?, script?, initialState? })` lazy-loads `react`,
  `@testing-library/react`, and `@stream-ui/react` at call time so the
  main entry stays React-free and the package installs even when the
  React-side hasn't been built locally.

Bundle: ~2.4 KB ESM gzipped for the main entry (size-limit budget 6 KB).
Coverage on `mock-transport.ts` is 94.7% lines / 85.7% branches.
