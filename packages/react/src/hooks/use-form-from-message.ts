import { type ChatState, type FormEngine, createFormEngine } from '@stream-ui/core';
import type { FormSpec, Surface } from '@stream-ui/protocol';
import { useEffect, useMemo, useState } from 'react';
import { useChatContext } from '../provider.js';

/**
 * Look up the latest FormSpec associated with a message and return a
 * cached FormEngine for it.
 *
 * Convention: the agent emits a UI_SURFACE_UPDATE whose `surfaceId`
 * matches the `messageId` of the parent assistant message. The first
 * `form` component found in that surface is used.
 *
 * Callers may override the lookup heuristic by passing `selectFormSpec`.
 */
export interface UseFormFromMessageOptions {
  /** Custom selector — receives the full chat state, returns a FormSpec or null. */
  selectFormSpec?: (state: ChatState, messageId: string) => FormSpec | null;
  /** Optional onSubmit handler, forwarded to the engine. */
  onSubmit?: Parameters<typeof createFormEngine>[0]['onSubmit'];
}

export function useFormFromMessage(
  messageId: string,
  options: UseFormFromMessageOptions = {},
): FormEngine | null {
  const { store, forms } = useChatContext();
  const { selectFormSpec = defaultSelectFormSpec, onSubmit } = options;

  // Re-evaluate on every store update; we don't use useSyncExternalStore
  // here because we transform a derived shape (engine identity) and want
  // strict referential stability per (messageId, specId).
  const [spec, setSpec] = useState<FormSpec | null>(() =>
    selectFormSpec(store.getSnapshot(), messageId),
  );
  useEffect(() => {
    const update = () => {
      const next = selectFormSpec(store.getSnapshot(), messageId);
      setSpec((prev: FormSpec | null) => (prev === next ? prev : next));
    };
    update();
    return store.subscribe(update);
  }, [store, messageId, selectFormSpec]);

  return useMemo(() => {
    if (!spec) return null;
    const key = `${messageId}::${spec.id}`;
    const cached = forms.get(key);
    if (cached) return cached;
    const engine = createFormEngine({ spec, onSubmit, surfaceId: messageId });
    forms.set(key, engine);
    return engine;
  }, [spec, messageId, forms, onSubmit]);
}

function defaultSelectFormSpec(state: ChatState, messageId: string): FormSpec | null {
  const surface = state.surfaces.get(messageId);
  if (surface) {
    const spec = findFormSpec(surface);
    if (spec) return spec;
  }
  // Fallback: scan every surface for a form whose spec.id matches the messageId.
  for (const s of state.surfaces.values()) {
    const spec = findFormSpec(s, messageId);
    if (spec) return spec;
  }
  return null;
}

function findFormSpec(surface: Surface, formIdHint?: string): FormSpec | null {
  return walk(surface.root, formIdHint);
}

function walk(
  node: { kind: string; props?: Record<string, unknown>; children?: readonly unknown[] },
  formIdHint?: string,
): FormSpec | null {
  if (node.kind === 'form') {
    const spec = (node.props as { spec?: FormSpec } | undefined)?.spec;
    if (spec && (!formIdHint || spec.id === formIdHint)) return spec;
  }
  if (!node.children) return null;
  for (const child of node.children) {
    const hit = walk(
      child as { kind: string; props?: Record<string, unknown>; children?: readonly unknown[] },
      formIdHint,
    );
    if (hit) return hit;
  }
  return null;
}
