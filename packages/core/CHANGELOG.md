# @stream-ui/core

## 1.0.0

### Minor Changes

- b4cc27d: [CHAT 03 — CORE] Initial implementation of `@stream-ui/core`:

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

- 169a2e4: CHAT 05 — `@stream-ui/react-native` first cut.

  - New subpath `@stream-ui/core/shared-react` exposes the React hooks
    (`useChatClient`, `useChatState`, `useMessages`, `useToolCalls`,
    `useSurface`, `useAgentState`, `useRunStatus`, `useForm`,
    `useFormField`) shared by `@stream-ui/react` and
    `@stream-ui/react-native`. `react` is an optional peer dep on
    `@stream-ui/core`; the main entry stays zero-React.
  - `@stream-ui/react-native` re-exports those hooks and ships native
    primitives: `Chat.Root` (KeyboardAvoidingView + provider),
    `Chat.Messages` (FlatList with id key extractor), `Chat.Composer`
    (TextInput → `client.send`), `Form.Root`, `Form.Field` (auto-wires
    TextInput / Switch / Picker children), `Form.Errors`, `Form.Submit`.
  - `FormEngine` now exposes the source `spec` so bindings can inspect
    field kinds without a parallel reference.
  - Size budget: ≤ 8KB ESM gzipped for the primitives (excluding peer
    deps + core). Enforced via `size-limit`.
  - ESLint config bans DOM globals (`window`, `document`, …) via
    `no-restricted-globals` + `eslint-plugin-react-native`.
  - Tests: jest-expo preset; covers hook re-exports, FlatList key
    extractor, FormField wiring to a TextInput.
