import type { FieldSpec, FormSpec, FormSubmitPayload } from '@stream-ui/protocol';
import { createStore } from '../state/store.js';
import type { Store } from '../state/store.js';
import {
  type FieldErrors,
  type FormValues,
  type Validator,
  composeValidators,
  specConstraintsValidator,
} from './validator.js';

export type FormStatus = 'idle' | 'validating' | 'submitting' | 'submitted' | 'error';

export interface FormState {
  values: FormValues;
  errors: FieldErrors;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  status: FormStatus;
  /** Submission count — useful for showing "all errors" only post-submit. */
  submitCount: number;
  /** Last submission error (transport / handler). */
  submitError?: string;
  /** True iff every field with a `required` constraint has a non-empty value. */
  isValid: boolean;
}

export interface FormEngineOptions {
  /** The form spec drives initial values + constraint validation. */
  spec: FormSpec;
  /** Optional additional validator (composed with spec constraints). */
  validator?: Validator;
  /**
   * Submit handler invoked by `submit()`. If omitted, `submit()` resolves
   * with the payload after passing validation but does not call any side
   * effect — the host wires up the SubmitAction target itself.
   */
  onSubmit?: (payload: FormSubmitPayload) => Promise<void> | void;
  /** Surface id, propagated into the submit payload. */
  surfaceId?: string;
}

export interface FormEngine {
  store: Store<FormState>;
  setField(name: string, value: unknown): void;
  blur(name: string): void;
  /** Reset to initial values; clears errors/touched/dirty. */
  reset(): void;
  /** Run validation. Returns the resulting error map. */
  validate(): Promise<FieldErrors>;
  /** Validate then call `onSubmit` (or return the payload). */
  submit(): Promise<FormSubmitPayload | null>;
  /** Tear down (currently a no-op, kept for symmetry). */
  dispose(): void;
}

export function initialValues(spec: FormSpec): FormValues {
  const out: FormValues = {};
  for (const f of spec.fields) {
    const dv = pickDefault(f);
    if (dv !== undefined) out[f.name] = dv;
  }
  if (spec.initialValues) {
    for (const [k, v] of Object.entries(spec.initialValues)) {
      out[k] = v;
    }
  }
  return out;
}

function pickDefault(field: FieldSpec): unknown {
  if (field.defaultValue === undefined) return undefined;
  const dv = field.defaultValue as unknown;
  if (
    typeof dv === 'object' &&
    dv !== null &&
    'kind' in dv &&
    (dv as { kind: string }).kind === 'literal' &&
    'value' in dv
  ) {
    return (dv as { value: unknown }).value;
  }
  // For ref/expr bindings, the host resolves them; we leave them out.
  if (
    typeof dv === 'object' &&
    dv !== null &&
    'kind' in dv &&
    ((dv as { kind: string }).kind === 'ref' || (dv as { kind: string }).kind === 'expr')
  ) {
    return undefined;
  }
  return dv;
}

export function createFormEngine(opts: FormEngineOptions): FormEngine {
  const { spec } = opts;
  const validator = opts.validator
    ? composeValidators(specConstraintsValidator(spec), opts.validator)
    : specConstraintsValidator(spec);

  const initial = initialValues(spec);
  const store = createStore<FormState>({
    values: initial,
    errors: {},
    touched: {},
    dirty: {},
    status: 'idle',
    submitCount: 0,
    isValid: computeIsValid(spec, initial, {}),
  });

  const runValidate = async (): Promise<FieldErrors> => {
    const res = validator.validate(store.getSnapshot().values);
    const errors = res instanceof Promise ? await res : res;
    store.update((s) => ({
      ...s,
      errors,
      isValid: hasNoErrors(errors) && requiredFilled(spec, s.values),
    }));
    return errors;
  };

  return {
    store,
    setField(name, value) {
      store.update((s) => {
        const values = { ...s.values, [name]: value };
        const dirty = { ...s.dirty, [name]: true };
        return {
          ...s,
          values,
          dirty,
          isValid: hasNoErrors(s.errors) && requiredFilled(spec, values),
        };
      });
    },
    blur(name) {
      store.update((s) => {
        if (s.touched[name]) return s;
        return { ...s, touched: { ...s.touched, [name]: true } };
      });
      void runValidate();
    },
    reset() {
      store.set({
        values: initial,
        errors: {},
        touched: {},
        dirty: {},
        status: 'idle',
        submitCount: 0,
        isValid: computeIsValid(spec, initial, {}),
      });
    },
    async validate() {
      store.update((s) => ({ ...s, status: 'validating' }));
      const errors = await runValidate();
      store.update((s) => ({ ...s, status: hasNoErrors(errors) ? 'idle' : 'error' }));
      return errors;
    },
    async submit() {
      store.update((s) => ({
        ...s,
        status: 'validating',
        submitCount: s.submitCount + 1,
        submitError: undefined,
      }));
      const errors = await runValidate();
      if (!hasNoErrors(errors)) {
        store.update((s) => ({
          ...s,
          status: 'error',
          // Touch every field so all errors render.
          touched: Object.fromEntries(spec.fields.map((f) => [f.name, true])),
        }));
        return null;
      }
      const payload: FormSubmitPayload = {
        formId: spec.id,
        values: store.getSnapshot().values,
        surfaceId: opts.surfaceId,
      };
      store.update((s) => ({ ...s, status: 'submitting' }));
      try {
        if (opts.onSubmit) await opts.onSubmit(payload);
        store.update((s) => ({ ...s, status: 'submitted' }));
        return payload;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        store.update((s) => ({ ...s, status: 'error', submitError: message }));
        return null;
      }
    },
    dispose() {
      /* no-op */
    },
  };
}

function hasNoErrors(errors: FieldErrors): boolean {
  for (const v of Object.values(errors)) {
    if (v && v.length > 0) return false;
  }
  return true;
}

function requiredFilled(spec: FormSpec, values: FormValues): boolean {
  for (const f of spec.fields) {
    if (!f.constraints?.required) continue;
    const v = values[f.name];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
      return false;
    }
  }
  return true;
}

function computeIsValid(spec: FormSpec, values: FormValues, errors: FieldErrors): boolean {
  return hasNoErrors(errors) && requiredFilled(spec, values);
}
