/**
 * `@stream-ui/testing/react` — optional React Testing Library helper.
 *
 * Importing this entry doesn't pull React or RTL into the main bundle;
 * dependencies are resolved lazily inside `renderWithChat`.
 */
export {
  renderWithChat,
  type RenderWithChatOptions,
  type RenderWithChatResult,
} from './helpers/render-with-chat.js';
