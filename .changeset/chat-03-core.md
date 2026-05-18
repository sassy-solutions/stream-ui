---
'@stream-ui/core': minor
---

[CHAT 03 — CORE] Initial implementation of `@stream-ui/core`:

- `createChatClient({ transport, initialState? })` — high-level chat client
  exposing a `useSyncExternalStore`-compatible store, `send()`, `start()`,
  and `dispose()`.
- Transport contracts (`Transport`, `TransportConnection`) plus two
  built-in implementations:
  - `createSseTransport` — fetch-based SSE consumer with framing,
    `[DONE]` sentinel, and a separate `sendUrl`.
  - `createWebSocketTransport` — minimal WebSocket transport.
- Incremental JSON parser (`parsePartial`, `IncrementalJsonParser`) for
  streaming tool-call arguments. Zero-dep, handles partial strings,
  unterminated structures, and trailing literals.
- A2UI surface reducer (`reduceSurfaces`, `applyPatch`, `findComponent`)
  folding `UI_SURFACE_UPDATE` events into a `Map<surfaceId, Surface>`.
- Tiny external store (`createStore`) and pure AG-UI chat-state reducer
  (`reduce`, `initialChatState`).
- Form engine (`createFormEngine`) — pure FormSpec → state machine with
  values, errors, touched, dirty, and submission lifecycle.
- Optional zod adapter under the separate entry
  `@stream-ui/core/adapters/zod` (peer dep, listed as optional).

Bundle: ~4.81 KB ESM gzipped for the main entry (size-limit budget 15 KB).
Test coverage on `parser/*` and `form/*` is ≥95%.
