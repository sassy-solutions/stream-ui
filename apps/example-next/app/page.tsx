import type { ChatMessage } from '@stream-ui/core';
import Link from 'next/link';
import { ChatClient } from './components/chat-client';

/**
 * Server component. Renders the chat shell + a couple of seed messages
 * in HTML so that "View source" shows real content (SSR), then hands
 * control to the client component that talks to `/chat`.
 */
export default function HomePage() {
  const seedMessages: ChatMessage[] = [
    {
      id: 'seed-1',
      role: 'system',
      text: 'Welcome to the stream-ui Next.js demo. The HTML you see in "View source" was rendered server-side.',
      done: true,
    },
    {
      id: 'seed-2',
      role: 'assistant',
      text: 'Click "Stream demo" below to POST /chat. You will receive an AG-UI SSE stream that paints a checkout form progressively.',
      done: true,
    },
  ];

  return (
    <main className="page">
      <nav className="links">
        <Link href="/">/ (SSR + client streaming)</Link>
        <Link href="/rsc-demo">/rsc-demo (server-only RSC)</Link>
      </nav>
      <h1>stream-ui · Next.js 15 App Router demo</h1>
      <p className="lead">
        SSR HTML shell, client-side AG-UI SSE consumer, and a separate RSC streaming page powered by{' '}
        <code>streamChatUI</code> from <code>@stream-ui/react/rsc</code>.
      </p>
      <ChatClient seedMessages={seedMessages} chatEndpoint="/chat" />
    </main>
  );
}
