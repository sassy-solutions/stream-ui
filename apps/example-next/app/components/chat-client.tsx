'use client';

import {
  type ChatMessage,
  type ChatState,
  createChatClient,
  createSseTransport,
} from '@stream-ui/core';
import type { Component, FieldSpec, FormSpec } from '@stream-ui/protocol';
import {
  Chat,
  ChatProvider,
  Form,
  useChat,
  useChatClient,
  useFormFromMessage,
  useStreamStatus,
} from '@stream-ui/react';
import { useMemo, useState } from 'react';

/**
 * Client component. Wraps the chat tree in `<ChatProvider>` with a
 * `ChatClient` bound to the local `/chat` SSE route.
 *
 * The provider is seeded with the same messages the server rendered in
 * `app/page.tsx`, so the HTML shell stays consistent during hydration.
 */
export function ChatClient({
  seedMessages,
  chatEndpoint,
}: {
  seedMessages: ChatMessage[];
  chatEndpoint: string;
}) {
  const client = useMemo(
    () =>
      createChatClient({
        transport: createSseTransport({
          url: chatEndpoint,
          // First call to `send()` opens the POST stream — no initial payload.
          sendUrl: chatEndpoint,
        }),
        initialState: { messages: seedMessages },
      }),
    [chatEndpoint, seedMessages],
  );

  return (
    <ChatProvider client={client}>
      <ChatSurface />
    </ChatProvider>
  );
}

function ChatSurface() {
  const messages = useChat((s) => s.messages);
  const status = useChat((s) => s.status);
  const client = useChatClient();
  const [busy, setBusy] = useState(false);

  async function triggerDemoStream() {
    setBusy(true);
    try {
      // Body is ignored by the demo route; a real LLM wiring would put
      // the user message / thread id here.
      await client.send({ message: 'Start the demo stream.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <Chat.Root>
        <Chat.Messages>
          {(items) =>
            items.length === 0 ? (
              <p className="muted">No messages yet.</p>
            ) : (
              items.map((m) => <MessageItem key={m.id} message={m} />)
            )
          }
        </Chat.Messages>
        <div className="composer">
          <button type="button" onClick={triggerDemoStream} disabled={busy}>
            {busy ? 'Streaming…' : 'Stream demo'}
          </button>
          <span className="muted" aria-live="polite">
            run status: {status}
          </span>
        </div>
      </Chat.Root>
    </section>
  );
}

function MessageItem({ message }: { message: ChatMessage }) {
  return (
    <div
      className="message"
      data-role={message.role}
      data-streaming={message.done ? undefined : ''}
    >
      <strong>{message.role}: </strong>
      <Chat.MessageContent messageId={message.id} />
      <FormFromMessage messageId={message.id} />
      <StreamingHint messageId={message.id} />
    </div>
  );
}

function StreamingHint({ messageId }: { messageId: string }) {
  const status = useStreamStatus(`message:${messageId}`);
  if (!status.streaming) return null;
  return <span className="muted"> · streaming…</span>;
}

/**
 * If a UI_SURFACE_UPDATE carrying a FormSpec arrived under this
 * message's id, build a FormEngine for it and render the form.
 */
function FormFromMessage({ messageId }: { messageId: string }) {
  const spec = useChat((s) => selectFormSpec(s, messageId));
  const engine = useFormFromMessage(messageId, {
    onSubmit: async (payload) => {
      // Demo: just log the payload. A real app would POST it back to
      // the agent (e.g. via client.send({ formSubmit: payload })).
      // eslint-disable-next-line no-console
      console.log('[example-next] form submitted', payload);
    },
  });
  if (!engine || !spec) return null;
  return (
    <Form.Root engine={engine} className="form-shell">
      <h3>{spec.title ?? 'Form'}</h3>
      {spec.description ? <p className="muted">{spec.description}</p> : null}
      {spec.fields.map((f) => (
        <FieldRow key={f.name} field={f} />
      ))}
      <Form.Submit>{spec.submit?.label ?? 'Submit'}</Form.Submit>
    </Form.Root>
  );
}

function FieldRow({ field }: { field: FieldSpec }) {
  // The wrapping <label> associates with its descendant control even
  // without an explicit `for=`; <Form.Field> auto-injects an `id` via
  // `useField`, but biome can't see through the indirection.
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: <Form.Field> injects the control.
    <label>
      <span>{field.label ?? field.name}</span>
      <FieldControl field={field} />
      <Form.FieldError name={field.name} className="error" />
    </label>
  );
}

function selectFormSpec(state: ChatState, messageId: string): FormSpec | null {
  const surface = state.surfaces.get(messageId);
  if (!surface) return null;
  return findFormSpec(surface.root);
}

function findFormSpec(node: Component | undefined): FormSpec | null {
  if (!node) return null;
  if (node.kind === 'form') {
    const spec = (node.props as { spec?: FormSpec } | undefined)?.spec;
    if (spec) return spec;
  }
  const children = (node as { children?: readonly Component[] }).children;
  if (children) {
    for (const child of children) {
      const found = findFormSpec(child);
      if (found) return found;
    }
  }
  return null;
}

function resolveOptions(spec: FieldSpec): readonly { label: string; value: string }[] {
  const raw = spec.options;
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((o) => ({ label: o.label, value: String(o.value) }));
}

function FieldControl({ field }: { field: FieldSpec }) {
  switch (field.kind) {
    case 'textarea':
      return <Form.Field name={field.name} as="textarea" placeholder={field.placeholder} />;
    case 'select':
      return (
        <Form.Field name={field.name} asChild>
          <select>
            <option value="">— select —</option>
            {resolveOptions(field).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Form.Field>
      );
    case 'checkbox':
      return (
        <Form.Field name={field.name} asChild>
          <input type="checkbox" />
        </Form.Field>
      );
    case 'radio':
      return (
        <span>
          {resolveOptions(field).map((o) => (
            <label key={o.value} style={{ display: 'inline-flex', gap: 4, marginRight: 12 }}>
              <Form.Field name={field.name} asChild>
                <input type="radio" value={o.value} />
              </Form.Field>
              {o.label}
            </label>
          ))}
        </span>
      );
    case 'email':
      return <Form.Field name={field.name} type="email" placeholder={field.placeholder} />;
    default:
      return <Form.Field name={field.name} placeholder={field.placeholder} />;
  }
}
