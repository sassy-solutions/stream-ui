# @stream-ui/protocol

> Types-only package. AG-UI events + A2UI v0.9 surfaces + `form` extension.
> Zero runtime deps. ~2KB gzipped (only the `AG_UI_EVENT_TYPES` const and JSON schemas survive tree-shake).

## What's inside

- **AG-UI events** (`./src/ag-ui/events.ts`) — discriminated union of all AG-UI wire events: `RunStarted`, `RunFinished`, `RunError`, `TextMessage*`, `ToolCall*`, `StateSnapshot`, `StateDelta`, `UISurfaceUpdate`, `CustomEvent`. Wire-level `type` discriminants live in `AG_UI_EVENT_TYPES`.
- **A2UI v0.9 surface** (`./src/a2ui/surface.ts`) — `Surface`, `Component`, `DataBinding`, `SurfacePatch`. Components are extensible via `string &amp; {}` kinds; `props` is an open record.
- **`form` extension** (`./src/a2ui/form.ts`) — `FormSpec`, `FieldSpec`, `SubmitAction`, plus a `FormComponent` specialization of `Component` that carries a typed `spec`.
- **JSON Schemas** (`./src/schemas/`) — draft 2020-12 schemas for `AgUiEvent`, `Surface`, and `FormSpec`. Use them on the agent side to validate emitted events; stream-ui itself does not ship a validator.

## Install

```bash
pnpm add @stream-ui/protocol
```

## Usage

```ts
import type { AgUiEvent, FormSpec, Surface } from "@stream-ui/protocol";
import { AG_UI_EVENT_TYPES, formSpecSchema } from "@stream-ui/protocol";

function isTextContent(e: AgUiEvent) {
  return e.type === AG_UI_EVENT_TYPES.TEXT_MESSAGE_CONTENT;
}
```

## Design notes

- The package exports type aliases only — `Bind<...>`, `Bindable<T>` are erased at build time.
- The only runtime artefacts are `AG_UI_EVENT_TYPES` (a const object of wire tag strings) and the three JSON schemas. Bundlers tree-shake everything you don't import.
- `UI_SURFACE_UPDATE` is the carrier event that lifts an A2UI `Surface` (or a `SurfacePatch`) over an AG-UI stream. The AG-UI core spec does not yet pin a canonical name for this; we chose `UI_SURFACE_UPDATE` and documented it inline.

## License

MIT
