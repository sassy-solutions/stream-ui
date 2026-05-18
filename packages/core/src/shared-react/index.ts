/**
 * `@stream-ui/core/shared-react` — React hooks shared by `@stream-ui/react`
 * and `@stream-ui/react-native`.
 *
 * Imports `react` as a peer dependency. The main `@stream-ui/core` entry
 * remains zero-React; this submodule is opt-in via the
 * `@stream-ui/core/shared-react` subpath export.
 *
 * The hooks here are *headless*: they return state + actions only. The
 * web/native bindings ship their own primitives on top.
 */

export {
  useChatClient,
  useChatState,
  useMessages,
  useToolCalls,
  useSurface,
  useAgentState,
  useRunStatus,
} from './chat.js';

export type {
  UseChatClientOptions,
  UseChatClientResult,
} from './chat.js';

export { useForm, useFormField } from './form.js';
export type {
  UseFormOptions,
  UseFormResult,
  UseFormFieldResult,
} from './form.js';
