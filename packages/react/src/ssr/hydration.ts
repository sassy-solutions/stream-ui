import { useId } from 'react';

/**
 * Stable, SSR-safe id generator scoped to a logical name.
 *
 * `useId()` already provides hydration-stable ids; this helper just
 * tags it with a human-readable prefix so DevTools and `aria-describedby`
 * references read sensibly (e.g. "chat-msg-:r0:").
 */
export function useStableId(prefix: string): string {
  const id = useId();
  return `${prefix}-${id}`;
}
