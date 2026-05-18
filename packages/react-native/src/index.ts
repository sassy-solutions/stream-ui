/**
 * `@stream-ui/react-native` — React Native hooks + native primitives
 * (TextInput, FlatList) for the stream-ui form-first runtime.
 *
 * Hooks come from `@stream-ui/core/shared-react` (same source as
 * `@stream-ui/react`). Primitives wrap RN native components and are
 * platform-aware (KeyboardAvoidingView, Platform.OS).
 *
 * Zero DOM imports — verified at lint time via eslint-plugin-react-native.
 */

// Hooks (shared with @stream-ui/react)
export * from './hooks/index.js';

// Native primitives
export {
  Chat,
  ChatRoot,
  ChatMessages,
  ChatComposer,
} from './primitives/chat.js';
export type {
  ChatRootProps,
  ChatMessagesProps,
  ChatComposerProps,
} from './primitives/chat.js';

export {
  Form,
  FormRoot,
  FormField,
  FormErrors,
  FormSubmit,
} from './primitives/form.js';
export type {
  FormRootProps,
  FormFieldProps,
  FormErrorsProps,
  FormSubmitProps,
} from './primitives/form.js';

// Keyboard helpers
export {
  getKeyboardAvoidingBehavior,
  getKeyboardVerticalOffset,
} from './keyboard/avoiding-view.js';
export type { KeyboardAvoidingBehavior } from './keyboard/avoiding-view.js';
