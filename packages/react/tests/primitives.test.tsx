import { type ChatState, createFormEngine, createStore, initialChatState } from '@stream-ui/core';
import type { FormSpec } from '@stream-ui/protocol';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Chat } from '../src/primitives/chat.js';
import { Form } from '../src/primitives/form.js';
import { ChatProvider } from '../src/provider.js';

const spec: FormSpec = {
  id: 'login',
  fields: [
    { name: 'email', kind: 'email', constraints: { required: true } },
    { name: 'password', kind: 'password', constraints: { required: true, minLength: 4 } },
  ],
  submit: { target: 'tool:login' },
};

describe('<Chat.*> primitives', () => {
  function makeProvider(state: Partial<ChatState>) {
    const store = createStore<ChatState>({ ...initialChatState, ...state });
    return {
      store,
      Wrapper: ({ children }: { children: React.ReactNode }) => (
        <ChatProvider initialState={state}>{children}</ChatProvider>
      ),
    };
  }

  it('<Chat.Root> renders div by default', () => {
    const { Wrapper } = makeProvider({});
    render(
      <Wrapper>
        <Chat.Root data-testid="r">x</Chat.Root>
      </Wrapper>,
    );
    expect(screen.getByTestId('r').tagName).toBe('DIV');
  });

  it('<Chat.Root asChild> composes onto child', () => {
    const { Wrapper } = makeProvider({});
    render(
      <Wrapper>
        <Chat.Root asChild data-testid="r">
          <section />
        </Chat.Root>
      </Wrapper>,
    );
    expect(screen.getByTestId('r').tagName).toBe('SECTION');
  });

  it('<Chat.Message> renders matching message and exposes data attrs', () => {
    const { Wrapper } = makeProvider({
      messages: [{ id: 'm1', role: 'assistant', text: 'hi', done: false }],
    });
    render(
      <Wrapper>
        <Chat.Message messageId="m1" data-testid="msg">
          <Chat.MessageContent messageId="m1" data-testid="content" />
        </Chat.Message>
      </Wrapper>,
    );
    const node = screen.getByTestId('msg');
    expect(node.getAttribute('data-role')).toBe('assistant');
    expect(node.hasAttribute('data-streaming')).toBe(true);
    expect(screen.getByTestId('content').textContent).toBe('hi');
  });

  it('<Chat.Message> returns null when message id missing', () => {
    const { Wrapper } = makeProvider({});
    const { container } = render(
      <Wrapper>
        <Chat.Message messageId="missing" />
      </Wrapper>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('<Chat.Composer> calls onSubmitMessage with form text', () => {
    const { Wrapper } = makeProvider({});
    const onSubmitMessage = vi.fn();
    render(
      <Wrapper>
        <Chat.Composer onSubmitMessage={onSubmitMessage} data-testid="composer">
          <input name="message" defaultValue="hello" />
          <button type="submit">send</button>
        </Chat.Composer>
      </Wrapper>,
    );
    fireEvent.submit(screen.getByTestId('composer'));
    expect(onSubmitMessage).toHaveBeenCalledWith('hello');
  });
});

describe('<Form.*> primitives', () => {
  it('binds Field, shows FieldError after blur, and submits when valid', async () => {
    const engine = createFormEngine({ spec });
    const onSubmitted = vi.fn();

    render(
      <Form.Root engine={engine} onSubmitted={onSubmitted} data-testid="form">
        <Form.Field name="email" data-testid="email" />
        <Form.FieldError name="email" data-testid="email-err" />
        <Form.Field name="password" type="password" data-testid="pw" />
        <Form.Submit data-testid="submit">go</Form.Submit>
      </Form.Root>,
    );

    const email = screen.getByTestId('email') as HTMLInputElement;
    expect(email.tagName).toBe('INPUT');

    // Blurring an empty required field surfaces an error message.
    await act(async () => {
      fireEvent.blur(email);
      await Promise.resolve();
    });
    expect(screen.getByTestId('email-err').textContent).toMatch(/required/i);

    // Type values, then submit.
    await act(async () => {
      fireEvent.change(email, { target: { value: 'a@b.co' } });
      fireEvent.change(screen.getByTestId('pw'), { target: { value: 'secret' } });
    });
    await act(async () => {
      fireEvent.submit(screen.getByTestId('form'));
    });
    expect(onSubmitted).toHaveBeenCalled();
    const payload = onSubmitted.mock.calls[0]?.[0];
    expect(payload?.values).toEqual({ email: 'a@b.co', password: 'secret' });
  });

  it('Field asChild forwards bindings onto custom child', () => {
    const engine = createFormEngine({ spec });
    render(
      <Form.Root engine={engine}>
        <Form.Field name="email" asChild>
          <input data-testid="custom" />
        </Form.Field>
      </Form.Root>,
    );
    const node = screen.getByTestId('custom') as HTMLInputElement;
    expect(node.tagName).toBe('INPUT');
    expect(node.getAttribute('name')).toBe('email');
  });

  it('Field render-prop variant exposes binding to children fn', () => {
    const engine = createFormEngine({ spec });
    render(
      <Form.Root engine={engine}>
        <Form.Field name="email">
          {(props) => <span data-testid="snap">{props.value === undefined ? 'empty' : 'set'}</span>}
        </Form.Field>
      </Form.Root>,
    );
    expect(screen.getByTestId('snap').textContent).toBe('empty');
  });

  it('throws if Form.Field is used outside Form.Root', () => {
    // React swallows render errors and logs them. Suppress for this assertion.
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Form.Field name="email" />)).toThrow(/<Form\.Root/);
    err.mockRestore();
  });
});
