/**
 * React Testing Library helper. Implemented as a tiny function that
 * resolves `react`, `@testing-library/react`, and `@stream-ui/react` at
 * call time so this package can be installed and used without those
 * deps when the consumer only needs the mock transport / fixtures.
 *
 * NOTE: this file is intentionally written without top-level `react` or
 * RTL imports — peer deps are loaded via dynamic `import()`. The file
 * is only emitted into `dist/react.{js,cjs}` (a separate entry point),
 * so the main entry of `@stream-ui/testing` stays React-free.
 */
import type { ChatState } from '@stream-ui/core';
import type { Transport } from '@stream-ui/core';
import type { AgUiEvent } from '@stream-ui/protocol';
import { type MockTransport, createMockTransport } from '../mock-transport.js';

export interface RenderWithChatOptions {
  /**
   * Transport instance to wire into the ChatProvider. Defaults to a
   * mock transport built from `script` (or an empty script when
   * neither is provided).
   */
  transport?: Transport;
  /**
   * Convenience: when `transport` is not provided, build a mock
   * transport pre-loaded with this script.
   */
  script?: ReadonlyArray<AgUiEvent>;
  /** Seed the chat state — forwarded to the ChatProvider. */
  initialState?: Partial<ChatState>;
}

type RtlRenderResult = {
  unmount: () => void;
  rerender: (ui: unknown) => void;
  container: HTMLElement;
};

export interface RenderWithChatResult {
  /** RTL render result. Use `screen` from `@testing-library/react` for queries. */
  result: RtlRenderResult;
  /**
   * The transport in use. When the caller didn't pass one, this is the
   * generated `MockTransport` with `pause()`, `resume()`, etc.
   */
  transport: Transport | MockTransport;
}

interface ReactModule {
  createElement: (...args: unknown[]) => unknown;
}

interface RtlModule {
  render: (ui: unknown) => RtlRenderResult;
}

interface StreamUiReactModule {
  ChatProvider?: (props: unknown) => unknown;
}

const MISSING_DEP_HINT =
  'Install with: pnpm add -D @testing-library/react @stream-ui/react react react-dom';

async function loadDep<T>(specifier: string): Promise<T> {
  try {
    return (await import(/* @vite-ignore */ specifier)) as T;
  } catch (cause) {
    throw new Error(
      `@stream-ui/testing/react: failed to load \`${specifier}\`. ${MISSING_DEP_HINT}`,
      { cause: cause as Error },
    );
  }
}

/**
 * Render `ui` inside a `<ChatProvider>` backed by a (mock) transport.
 *
 * Returns the standard RTL render result plus the transport handle so
 * tests can step the stream:
 *
 * ```ts
 * const { transport } = await renderWithChat(<Chat />, {
 *   script: agUiTextStreamFixture('Hello!'),
 * });
 * (transport as MockTransport).flushAll();
 * ```
 */
export async function renderWithChat(
  ui: unknown,
  options: RenderWithChatOptions = {},
): Promise<RenderWithChatResult> {
  const transport: Transport | MockTransport =
    options.transport ?? createMockTransport({ script: options.script ?? [] });

  const [reactMod, rtlMod, streamUiReact] = await Promise.all([
    loadDep<ReactModule>('react'),
    loadDep<RtlModule>('@testing-library/react'),
    loadDep<StreamUiReactModule>('@stream-ui/react'),
  ]);

  const Provider = streamUiReact.ChatProvider;
  if (typeof Provider !== 'function') {
    throw new Error(
      '@stream-ui/testing/react: `@stream-ui/react` did not export `ChatProvider`. ' +
        'Upgrade to a version that ships ChatProvider, or pass a custom wrapper.',
    );
  }

  const wrapped = reactMod.createElement(
    Provider as never,
    { transport, initialState: options.initialState } as never,
    ui as never,
  );
  const result = rtlMod.render(wrapped);
  return { result, transport };
}
