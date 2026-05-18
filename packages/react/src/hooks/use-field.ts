import type { FormEngine, FormState } from '@stream-ui/core';
import { useCallback, useId, useSyncExternalStore } from 'react';

export interface UseFieldBinding {
  /** Stable id for `<label htmlFor>` ↔ `<input id>` wiring. */
  id: string;
  value: unknown;
  onChange: (eventOrValue: unknown) => void;
  onBlur: () => void;
  error: string | null;
  errors: readonly string[];
  dirty: boolean;
  touched: boolean;
  /** ARIA helpers. `ariaInvalid` is "true" only when the field has been touched. */
  ariaInvalid: 'true' | undefined;
  ariaDescribedBy: string | undefined;
  /** Element id for the error message — pair with the input via aria-describedby. */
  errorId: string;
}

/**
 * Bind a single form field to a {@link FormEngine}.
 *
 * Returns value/handlers + ARIA wiring. SSR-safe: snapshots are read
 * synchronously and the subscription only attaches client-side.
 */
export function useField(engine: FormEngine, name: string): UseFieldBinding {
  const reactId = useId();
  const id = `${reactId}-${name}`;
  const errorId = `${id}-error`;

  const subscribe = engine.store.subscribe;
  const getSnapshot = engine.store.getSnapshot;
  const state = useSyncExternalStore<FormState>(subscribe, getSnapshot, getSnapshot);

  const value = state.values[name];
  const errors = state.errors[name] ?? [];
  const touched = state.touched[name] ?? false;
  const dirty = state.dirty[name] ?? false;
  const error = touched && errors.length > 0 ? (errors[0] as string) : null;

  const onChange = useCallback(
    (eventOrValue: unknown) => {
      engine.setField(name, extractValue(eventOrValue));
    },
    [engine, name],
  );
  const onBlur = useCallback(() => {
    engine.blur(name);
  }, [engine, name]);

  return {
    id,
    value,
    onChange,
    onBlur,
    error,
    errors,
    dirty,
    touched,
    ariaInvalid: error ? 'true' : undefined,
    ariaDescribedBy: error ? errorId : undefined,
    errorId,
  };
}

function extractValue(input: unknown): unknown {
  if (input && typeof input === 'object' && 'target' in input) {
    const target = (input as { target: { type?: string; checked?: boolean; value?: unknown } })
      .target;
    if (target?.type === 'checkbox') return Boolean(target.checked);
    return target?.value;
  }
  return input;
}
