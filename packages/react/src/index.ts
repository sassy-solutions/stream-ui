/**
 * @stream-ui/react — React bindings for @stream-ui/core.
 *
 * Public surface:
 *   - Provider: `<ChatProvider>` + `useChatContext`.
 *   - Hooks: `useChat`, `useChatClient`, `useFormFromMessage`, `useField`,
 *     `useStreamStatus`, `useStableId`.
 *   - Primitives: `<Chat.*>`, `<Form.*>` (all `asChild`-aware).
 *   - Internal: `Slot`, `mergeRefs` — exported for ecosystem reuse.
 *
 * SSR-safe: zero top-level `window`/`document`. Hooks use
 * `useSyncExternalStore` with a server snapshot. Target: ≤7KB ESM gzipped.
 *
 * For the RSC streaming helper, import `@stream-ui/react/rsc` (separate
 * entry to keep server-only code out of the client bundle).
 */
export { ChatProvider, useChatContext } from './provider.js';
export type { ChatContextValue, ChatProviderProps } from './provider.js';

export { useChat, useChatClient } from './hooks/use-chat.js';
export { useField } from './hooks/use-field.js';
export type { UseFieldBinding } from './hooks/use-field.js';
export { useFormFromMessage } from './hooks/use-form-from-message.js';
export type { UseFormFromMessageOptions } from './hooks/use-form-from-message.js';
export { useStreamStatus } from './hooks/use-stream-status.js';
export type { StreamStatus } from './hooks/use-stream-status.js';
export { useStableId } from './ssr/hydration.js';

export { Chat } from './primitives/chat.js';
export type {
  ChatRootProps,
  ChatMessageProps,
  ChatMessageContentProps,
  ChatMessagesProps,
  ChatComposerProps,
  ChatStreamStatusProps,
} from './primitives/chat.js';

export { Form } from './primitives/form.js';
export type {
  FormRootProps,
  FormFieldProps,
  FormFieldRenderProps,
  FormFieldErrorProps,
  FormSubmitProps,
} from './primitives/form.js';

export { Slot, mergeRefs } from './primitives/slot.js';
