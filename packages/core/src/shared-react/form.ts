import type { FieldSpec, FormSubmitPayload } from '@stream-ui/protocol';
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import {
  type FormEngine,
  type FormEngineOptions,
  type FormState,
  createFormEngine,
} from '../form/engine.js';

export interface UseFormOptions extends FormEngineOptions {}

export interface UseFormResult {
  engine: FormEngine;
  state: FormState;
  setField: (name: string, value: unknown) => void;
  blur: (name: string) => void;
  reset: () => void;
  submit: () => Promise<FormSubmitPayload | null>;
}

/**
 * Drive a `FormEngine` from React. The engine is created lazily and
 * disposed on unmount. Re-renders are scoped to engine state changes.
 */
export function useForm(options: UseFormOptions): UseFormResult {
  const ref = useRef<FormEngine | null>(null);
  if (ref.current === null) {
    ref.current = createFormEngine(options);
  }
  const engine = ref.current;

  // biome-ignore lint/correctness/useExhaustiveDependencies: the engine instance is bound to the host's lifetime.
  useEffect(() => {
    return () => {
      engine.dispose();
      ref.current = null;
    };
  }, []);

  const subscribe = useCallback(
    (listener: () => void) => engine.store.subscribe(listener),
    [engine],
  );
  const getSnapshot = useCallback(() => engine.store.getSnapshot(), [engine]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setField = useCallback(
    (name: string, value: unknown) => engine.setField(name, value),
    [engine],
  );
  const blur = useCallback((name: string) => engine.blur(name), [engine]);
  const reset = useCallback(() => engine.reset(), [engine]);
  const submit = useCallback(() => engine.submit(), [engine]);

  return useMemo(
    () => ({
      engine,
      state,
      setField,
      blur,
      reset,
      submit,
    }),
    [engine, state, setField, blur, reset, submit],
  );
}

export interface UseFormFieldResult {
  name: string;
  value: unknown;
  errors: ReadonlyArray<string>;
  touched: boolean;
  dirty: boolean;
  spec: FieldSpec | undefined;
  setValue: (value: unknown) => void;
  onBlur: () => void;
}

/**
 * Bind a field to a `FormEngine`. Returns the slice of state for that
 * field plus the wired setters. Re-renders only when the field's value,
 * errors, touched, or dirty flags change.
 */
const EMPTY_ERRORS: ReadonlyArray<string> = Object.freeze([]);

export function useFormField(engine: FormEngine, name: string): UseFormFieldResult {
  const selector = useCallback(
    (state: FormState) => ({
      value: state.values[name],
      errors: (state.errors[name] ?? EMPTY_ERRORS) as ReadonlyArray<string>,
      touched: !!state.touched[name],
      dirty: !!state.dirty[name],
    }),
    [name],
  );

  const prevRef = useRef<{
    value: unknown;
    errors: ReadonlyArray<string>;
    touched: boolean;
    dirty: boolean;
  } | null>(null);

  const subscribe = useCallback(
    (listener: () => void) => engine.store.subscribe(listener),
    [engine],
  );
  const getSnapshot = useCallback(() => {
    const next = selector(engine.store.getSnapshot());
    const prev = prevRef.current;
    if (
      prev !== null &&
      prev.value === next.value &&
      prev.errors === next.errors &&
      prev.touched === next.touched &&
      prev.dirty === next.dirty
    ) {
      return prev;
    }
    prevRef.current = next;
    return next;
  }, [engine, selector]);

  const slice = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const spec = useMemo(() => engine.spec.fields.find((f) => f.name === name), [engine, name]);

  const setValue = useCallback((value: unknown) => engine.setField(name, value), [engine, name]);
  const onBlur = useCallback(() => engine.blur(name), [engine, name]);

  return {
    name,
    value: slice.value,
    errors: slice.errors,
    touched: slice.touched,
    dirty: slice.dirty,
    spec,
    setValue,
    onBlur,
  };
}
