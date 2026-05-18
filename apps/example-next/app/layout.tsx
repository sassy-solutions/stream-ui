import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'stream-ui · Next.js demo',
  description:
    'Next.js 15 App Router demo for @stream-ui — SSR shell, /chat SSE route, and an RSC streaming page.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
