---
'@stream-ui/react': minor
---

[CHAT 04 — REACT] Initial implementation of `@stream-ui/react`:

- `<ChatProvider>` + `useChatContext` — store/client/form-registry context.
- Hooks: `useChat` (selector + cached snapshot, SSR-safe via
  `useSyncExternalStore`), `useChatClient`, `useField` (value/handlers
  + ARIA wiring), `useFormFromMessage` (looks up FormSpec from surfaces,
  caches engine per messageId+formId), `useStreamStatus` (per-message
  or per-tool-call streaming status), `useStableId`.
- Headless primitives with `asChild` (Radix-style, zero-dep `Slot`):
  - `<Chat.Root>`, `<Chat.Messages>`, `<Chat.Message>`, `<Chat.MessageContent>`,
    `<Chat.Composer>`, `<Chat.StreamStatus>`.
  - `<Form.Root>`, `<Form.Field>` (default `<input>` / `as` / render-prop / `asChild`),
    `<Form.FieldError>`, `<Form.Submit>`.
- `Slot` merges refs, composes event handlers (child runs first;
  slot handler is skipped if the child called `preventDefault`),
  shallow-merges `style` / `className`, and lets the child win on prop
  conflicts.
- RSC helper at the separate entry `@stream-ui/react/rsc`:
  `streamChatUI(events, render, opts?)` — async generator that folds an
  AsyncIterable of AG-UI events through the core reducer and yields one
  React node per state transition. `collect()` drain helper included.
- SSR-safe: no `window` / `document` at module top-level; hooks use
  `useSyncExternalStore` with stable `getServerSnapshot`.
- Bundles (size-limit, gzipped):
  - main ESM entry: **2.51 KB** (budget 7 KB).
  - `./rsc` ESM entry: **351 B** (budget 2 KB).
- Tests: 40 passing across `tests/` (vitest + jsdom + @testing-library/react;
  `tests/rsc.test.ts` pinned to Node env).
