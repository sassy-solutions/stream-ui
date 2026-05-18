# example-next

Next.js 15 App Router demo for [`@stream-ui`](../..). Demonstrates three
streaming paths in one app:

| Route       | What it shows                                                                  |
| ----------- | ------------------------------------------------------------------------------ |
| `/`         | SSR HTML shell + client-side AG-UI SSE consumer via `createSseTransport`.      |
| `/chat`     | `POST` route handler that returns `text/event-stream` of AG-UI events.         |
| `/rsc-demo` | Server-only RSC page using `streamChatUI` from `@stream-ui/react/rsc`.         |

## Run it

```bash
pnpm install
pnpm --filter @stream-ui/core build  # one-time, monorepo prerequisite
pnpm --filter example-next dev
```

Visit <http://localhost:3000>:

- "View source" → the chat shell is already in the HTML (SSR).
- Click **Stream demo** → DevTools → Network → `/chat` returns
  `text/event-stream` and the assistant message + checkout form appear
  progressively.
- Navigate to `/rsc-demo` → no client bundle for the chat tree; the
  page renders the final folded state from `streamChatUI`.

## How streaming is wired

- `app/chat/route.ts` replays the fixtures from `@stream-ui/testing`
  (`agUiTextStreamFixture` → `agUiFormFixture(checkoutFormSpec)`) over
  a `ReadableStream`. Each AG-UI event is one SSE frame:

  ```
  event: TEXT_MESSAGE_CONTENT
  data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"…","delta":"…"}
  ```

- `app/components/chat-client.tsx` is a `'use client'` component that
  builds a `ChatClient` with `createSseTransport({ url: '/chat' })`,
  seeds the initial state with the messages SSR already painted, and
  renders `<Chat.*>` / `<Form.*>` primitives.

- `app/rsc-demo/page.tsx` consumes a server-side async generator of
  AG-UI events through `streamChatUI(events, render)` and renders the
  result inside an RSC `<Suspense>` boundary.

## Plugging in a real LLM

The demo uses fixtures so it runs with zero secrets. To wire a real
provider (e.g. `@ai-sdk/anthropic`), replace the `events` array in
`app/chat/route.ts` with a generator that adapts your provider's
streaming response into AG-UI events. See the CHAT 07 docs for a
worked recipe.
