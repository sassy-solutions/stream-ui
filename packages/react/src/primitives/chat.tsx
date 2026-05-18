import type { ChatMessage } from '@stream-ui/core';
/**
 * Headless <Chat.*> primitives.
 *
 * Each primitive accepts `asChild` (Radix pattern): when set, the
 * primitive composes itself onto its single child element, forwarding
 * refs/handlers/aria. When omitted, it renders a sensible default
 * element with minimal styling.
 */
import {
  type ComponentPropsWithoutRef,
  type ElementRef,
  type FormEvent,
  type ReactNode,
  forwardRef,
} from 'react';
import { useChat } from '../hooks/use-chat.js';
import { useStreamStatus } from '../hooks/use-stream-status.js';
import { Slot } from './slot.js';

// ---------- <Chat.Root> ----------

export interface ChatRootProps extends ComponentPropsWithoutRef<'div'> {
  asChild?: boolean;
}

const Root = forwardRef<ElementRef<'div'>, ChatRootProps>(function ChatRoot(
  { asChild, ...rest },
  ref,
) {
  const Comp = asChild ? Slot : 'div';
  return <Comp ref={ref} data-stream-ui-chat-root="" {...rest} />;
});

// ---------- <Chat.Messages> — render-prop helper ----------

export interface ChatMessagesProps {
  children: (messages: ReadonlyArray<ChatMessage>) => ReactNode;
}

function Messages({ children }: ChatMessagesProps) {
  const messages = useChat((s) => s.messages);
  return <>{children(messages)}</>;
}

// ---------- <Chat.Message> ----------

export interface ChatMessageProps extends ComponentPropsWithoutRef<'div'> {
  asChild?: boolean;
  messageId: string;
}

const Message = forwardRef<ElementRef<'div'>, ChatMessageProps>(function ChatMessage(
  { asChild, messageId, ...rest },
  ref,
) {
  const message = useChat((s) => s.messages.find((m) => m.id === messageId));
  if (!message) return null;
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      ref={ref}
      data-stream-ui-chat-message=""
      data-role={message.role}
      data-streaming={message.done ? undefined : ''}
      {...rest}
    />
  );
});

// ---------- <Chat.MessageContent> ----------

export interface ChatMessageContentProps extends ComponentPropsWithoutRef<'span'> {
  asChild?: boolean;
  messageId: string;
}

const MessageContent = forwardRef<ElementRef<'span'>, ChatMessageContentProps>(
  function ChatMessageContent({ asChild, messageId, children, ...rest }, ref) {
    const text = useChat((s) => s.messages.find((m) => m.id === messageId)?.text ?? '');
    const Comp = asChild ? Slot : 'span';
    return (
      <Comp ref={ref} {...rest}>
        {children ?? text}
      </Comp>
    );
  },
);

// ---------- <Chat.Composer> ----------

export interface ChatComposerProps extends ComponentPropsWithoutRef<'form'> {
  asChild?: boolean;
  onSubmitMessage?: (text: string) => void;
}

const Composer = forwardRef<ElementRef<'form'>, ChatComposerProps>(function ChatComposer(
  { asChild, onSubmitMessage, onSubmit, ...rest },
  ref,
) {
  const Comp = asChild ? Slot : 'form';
  return (
    <Comp
      ref={ref}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        onSubmit?.(event as unknown as Parameters<NonNullable<typeof onSubmit>>[0]);
        if (event.defaultPrevented) return;
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const text = String(data.get('message') ?? '');
        if (text) onSubmitMessage?.(text);
      }}
      {...rest}
    />
  );
});

// ---------- <Chat.StreamStatus> — render-prop helper ----------

export interface ChatStreamStatusProps {
  /** `message:<id>`, `tool:<id>`, or a bare id. */
  path: string;
  children: (status: ReturnType<typeof useStreamStatus>) => ReactNode;
}

function StreamStatus({ path, children }: ChatStreamStatusProps) {
  const status = useStreamStatus(path);
  return <>{children(status)}</>;
}

export const Chat = {
  Root,
  Messages,
  Message,
  MessageContent,
  Composer,
  StreamStatus,
};
