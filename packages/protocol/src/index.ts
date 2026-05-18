/**
 * @stream-ui/protocol — types for AG-UI events + A2UI v0.9 surfaces +
 * `form` extension. Zero runtime deps.
 *
 * After tree-shake, `dist/index.js` exports only the `AG_UI_EVENT_TYPES`
 * const and the (also `as const`) JSON schemas. Type aliases erase
 * entirely.
 */

// AG-UI
export {
  AG_UI_EVENT_TYPES,
  type AgUiEvent,
  type AgUiEventType,
  type RunStarted,
  type RunFinished,
  type RunError,
  type TextMessageStart,
  type TextMessageContent,
  type TextMessageEnd,
  type ToolCallStart,
  type ToolCallArgs,
  type ToolCallEnd,
  type StateSnapshot,
  type StateDelta,
  type JsonPatchOp,
  type UISurfaceUpdate,
  type CustomEvent,
  type Timestamp,
  type RunId,
  type MessageId,
  type ToolCallId,
} from './ag-ui/events.js';

// A2UI surface
export type {
  Surface,
  SurfacePatch,
  Component,
  ComponentBase,
  ComponentKind,
  FormComponent,
  DataBinding,
  BindingPath,
  Bind,
  Bindable,
} from './a2ui/surface.js';

// A2UI form extension
export type {
  FormSpec,
  FieldSpec,
  FieldKind,
  FieldOption,
  FieldConstraints,
  SubmitAction,
  FormSubmitPayload,
} from './a2ui/form.js';

// JSON Schemas (agent-side validation)
export {
  agUiEventSchema,
  surfaceSchema,
  formSpecSchema,
} from './schemas/index.js';
