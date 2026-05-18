# example-web

CSR demo for [`@stream-ui`](../../README.md): Vite + React + a tiny in-process AG-UI SSE mock.

```bash
pnpm install
pnpm --filter example-web dev
# → http://localhost:5173
```

## What it shows

1. Type a message and hit **Send**.
2. The Vite dev-server intercepts `POST /chat` (see `src/server-mock.ts`) and replays a scripted AG-UI SSE stream:
   - a short text reply, token-by-token
   - a `UI_SURFACE_UPDATE` carrying the `checkoutFormSpec` from `@stream-ui/testing`
3. `useFormFromMessage(messageId)` picks up the surface and renders a fully-bound checkout form via the headless `<Form.*>` primitives.
4. Submitting the form fires a `submitted` toast.

No real LLM, no backend — everything runs in the dev server.

## UI choice

`@stream-ui` is UI-agnostic — `<Chat.*>` and `<Form.*>` are headless primitives. The styling in this demo is a hand-rolled, shadcn-flavored aesthetic chosen purely for the showcase. Swap in Tailwind + shadcn, MUI, Mantine, Chakra, or your own design system without touching the protocol layer.

## File map

```
apps/example-web/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx          // React entry
    ├── app.tsx           // Chat shell + embedded form
    ├── server-mock.ts    // Vite middleware: POST /chat → AG-UI SSE
    └── styles.css        // hand-rolled shadcn-flavored styles
```
