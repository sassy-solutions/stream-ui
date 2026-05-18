import { createChatClient, createSseTransport } from '@stream-ui/core';
import type { FieldSpec, FormSpec } from '@stream-ui/protocol';
import {
  Chat,
  ChatProvider,
  Form,
  useChat,
  useChatClient,
  useFormFromMessage,
} from '@stream-ui/react';
import { useEffect, useMemo, useState } from 'react';

/**
 * Root component — wires up a real SSE chat client pointed at the Vite
 * dev-server mock at `POST /chat` (see `server-mock.ts`).
 */
export function App() {
  const client = useMemo(
    () =>
      createChatClient({
        transport: createSseTransport({ url: '/chat' }),
      }),
    [],
  );
  useEffect(() => {
    return () => void client.dispose();
  }, [client]);

  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <ChatProvider client={client}>
      <div className="app">
        <header className="app__header">
          <h1>@stream-ui · example-web</h1>
          <p>Vite + React CSR demo · token-streamed checkout form</p>
        </header>
        <ChatShell onSubmitted={() => setToast('submitted')} />
      </div>
      {toast ? <output className="toast">✓ {toast}</output> : null}
    </ChatProvider>
  );
}

function ChatShell({ onSubmitted }: { onSubmitted: () => void }) {
  const client = useChatClient();
  const [userMessages, setUserMessages] = useState<{ id: string; text: string }[]>([]);

  const handleSend = (text: string) => {
    const id = `user-${Date.now()}`;
    setUserMessages((prev) => [...prev, { id, text }]);
    void client.send({ message: text });
  };

  return (
    <main className="chat">
      <div className="chat__messages">
        {userMessages.map((m) => (
          <div key={m.id} className="msg" data-role="user">
            <div className="msg__role">You</div>
            <div className="msg__content">{m.text}</div>
          </div>
        ))}
        <AssistantMessages onSubmitted={onSubmitted} />
      </div>
      <Chat.Composer className="composer" onSubmitMessage={handleSend}>
        <input
          className="input"
          name="message"
          placeholder="Ask me to start a checkout…"
          autoComplete="off"
        />
        <button className="btn" type="submit">
          Send
        </button>
      </Chat.Composer>
    </main>
  );
}

function AssistantMessages({ onSubmitted }: { onSubmitted: () => void }) {
  const messages = useChat((s) => s.messages);
  return (
    <>
      {messages.map((m) => (
        <div key={m.id}>
          <div className="msg" data-role={m.role} data-streaming={m.done ? undefined : ''}>
            <div className="msg__role">{m.role}</div>
            <div className="msg__content">{m.text}</div>
          </div>
          <EmbeddedForm messageId={m.id} onSubmitted={onSubmitted} />
        </div>
      ))}
    </>
  );
}

function EmbeddedForm({
  messageId,
  onSubmitted,
}: {
  messageId: string;
  onSubmitted: () => void;
}) {
  const engine = useFormFromMessage(messageId, {
    onSubmit: async () => onSubmitted(),
  });
  const spec = useChat((s) => {
    const surface = s.surfaces.get(messageId);
    if (!surface) return null;
    return (surface.root.props as { spec?: FormSpec } | undefined)?.spec ?? null;
  });
  if (!engine || !spec) return null;

  return (
    <Form.Root engine={engine} className="form-card" onSubmitted={onSubmitted}>
      <h3>{spec.title ?? 'Form'}</h3>
      {spec.description ? <p className="description">{spec.description}</p> : null}
      {spec.fields.map((field) => (
        <FieldRow key={field.name} field={field} />
      ))}
      <div className="field-actions">
        <Form.Submit className="btn">{spec.submit?.label ?? 'Submit'}</Form.Submit>
      </div>
    </Form.Root>
  );
}

function FieldRow({ field }: { field: FieldSpec }) {
  if (field.kind === 'hidden') {
    return <Form.Field name={field.name} type="hidden" />;
  }

  if (field.kind === 'checkbox') {
    return (
      <div className="field">
        <Form.Field name={field.name}>
          {({ value, onChange, onBlur, error }) => (
            <>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => onChange(e.target.checked)}
                  onBlur={onBlur}
                />
                <span>{field.label ?? field.name}</span>
              </label>
              {error ? <span className="error">{error}</span> : null}
            </>
          )}
        </Form.Field>
      </div>
    );
  }

  if (field.kind === 'radio') {
    const opts = Array.isArray(field.options) ? field.options : [];
    return (
      <div className="field">
        <span className="field-label">{field.label ?? field.name}</span>
        <Form.Field name={field.name}>
          {({ value, onChange, onBlur, error }) => (
            <>
              {opts.map((opt) => (
                <label key={String(opt.value)} className="radio-row">
                  <input
                    type="radio"
                    name={field.name}
                    value={String(opt.value)}
                    checked={value === opt.value}
                    onChange={() => onChange(opt.value)}
                    onBlur={onBlur}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
              {error ? <span className="error">{error}</span> : null}
            </>
          )}
        </Form.Field>
      </div>
    );
  }

  if (field.kind === 'select') {
    const opts = Array.isArray(field.options) ? field.options : [];
    return (
      <div className="field">
        <span className="field-label">{field.label ?? field.name}</span>
        <Form.Field name={field.name}>
          {({ value, onChange, onBlur, error }) => (
            <>
              <select
                className="select"
                value={(value as string | undefined) ?? ''}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
              >
                <option value="" disabled>
                  Select…
                </option>
                {opts.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {error ? <span className="error">{error}</span> : null}
            </>
          )}
        </Form.Field>
      </div>
    );
  }

  if (field.kind === 'textarea') {
    return (
      <div className="field">
        <span className="field-label">{field.label ?? field.name}</span>
        <Form.Field name={field.name} asChild>
          <textarea className="textarea" placeholder={field.placeholder} />
        </Form.Field>
        <Form.FieldError name={field.name} className="error" />
      </div>
    );
  }

  return (
    <div className="field">
      <span className="field-label">{field.label ?? field.name}</span>
      <Form.Field
        name={field.name}
        className="input"
        type={inputTypeFor(field.kind)}
        placeholder={field.placeholder}
      />
      <Form.FieldError name={field.name} className="error" />
    </div>
  );
}

function inputTypeFor(kind: FieldSpec['kind']): string {
  switch (kind) {
    case 'email':
      return 'email';
    case 'url':
      return 'url';
    case 'password':
      return 'password';
    case 'number':
    case 'integer':
      return 'number';
    case 'date':
      return 'date';
    case 'datetime':
      return 'datetime-local';
    case 'time':
      return 'time';
    case 'file':
      return 'file';
    default:
      return 'text';
  }
}
