---
'@stream-ui/react-native': minor
'@stream-ui/core': minor
---

CHAT 05 — `@stream-ui/react-native` first cut.

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
