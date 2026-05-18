/**
 * Hook re-exports — the public hook API for `@stream-ui/react-native`.
 *
 * These come from `@stream-ui/core/shared-react`, which is the same
 * source `@stream-ui/react` consumes. Hosts pay the import cost once
 * (the host bundler dedupes the `react` peer dep).
 */

export {
  useChatClient,
  useChatState,
  useMessages,
  useToolCalls,
  useSurface,
  useAgentState,
  useRunStatus,
  useForm,
  useFormField,
} from '@stream-ui/core/shared-react';

export type {
  UseChatClientOptions,
  UseChatClientResult,
  UseFormOptions,
  UseFormResult,
  UseFormFieldResult,
} from '@stream-ui/core/shared-react';
