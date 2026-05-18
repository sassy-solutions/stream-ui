/**
 * `form` extension to A2UI v0.9 — first-class form spec for stream-ui.
 *
 * Forms are the marquee primitive of stream-ui. We model a FormSpec that
 * is independently usable (an agent can emit just a FormSpec without a
 * full Surface), and also embeddable as the `spec` prop of a `form`
 * Component (see ./surface.ts).
 *
 * Types-only — no runtime validation. Use `@stream-ui/core` to run a
 * FormSpec against user input; adapters for zod live there.
 */

import type { Bindable, DataBinding } from './surface.js';

// ---------- Field primitives ----------

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'url'
  | 'password'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'datetime'
  | 'time'
  | 'file'
  | 'hidden';

export interface FieldOption {
  label: string;
  value: string | number | boolean;
  /** Optional helper/description shown alongside the option. */
  description?: string;
  disabled?: boolean;
}

/**
 * Constraints recognised by the stream-ui form engine. Mirrors JSON
 * Schema validation keywords where possible; unrecognised constraints
 * are passed through to user-defined validators.
 */
export interface FieldConstraints {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  /** Multiple of N (numbers). */
  multipleOf?: number;
  /** For file/multiselect — array bounds. */
  minItems?: number;
  maxItems?: number;
  /** MIME types accepted by file inputs. */
  accept?: string[];
}

export interface FieldSpec<TKind extends FieldKind = FieldKind> {
  /** Stable field name — used as form data key. */
  name: string;
  kind: TKind;
  label?: string;
  description?: string;
  placeholder?: string;
  defaultValue?: Bindable<unknown>;
  /** Disables interaction; submitted value is still included. */
  disabled?: Bindable<boolean>;
  /** Hides the field entirely; submitted value is omitted. */
  hidden?: Bindable<boolean>;
  /** Visibility predicate — render iff truthy. */
  visibleIf?: DataBinding<boolean>;
  /** Static or bound option list for select/radio/multiselect/checkbox. */
  options?: Bindable<readonly FieldOption[]>;
  constraints?: FieldConstraints;
  /**
   * Free-form vendor-specific metadata. Engine passes this through to
   * the renderer (e.g. UI hints, ARIA overrides, analytics tags).
   */
  ui?: Record<string, unknown>;
}

// ---------- Submission ----------

export interface SubmitAction {
  /**
   * Where to send the form payload. Common shapes:
   * - `"tool:<name>"` — invoke an agent tool with the form payload as args
   * - `"event:<name>"` — emit a CUSTOM AG-UI event with the payload
   * - `"http:<METHOD> <url>"` — fire an HTTP request
   * Engine selects the binding based on the prefix; unknown prefixes are
   * surfaced to the host application.
   */
  target: string;
  /** Optional headers/metadata for http targets. */
  headers?: Record<string, string>;
  /** Optional label override for the submit button. */
  label?: string;
  /** Disable the submit control until all required constraints pass. */
  disableUntilValid?: boolean;
  /** Show a confirmation dialog before firing. */
  confirm?: {
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  };
}

// ---------- Form spec ----------

export interface FormSpec {
  /** Stable form id within the surface — used for partial updates. */
  id: string;
  /** Optional title and lead copy. */
  title?: string;
  description?: string;
  /** Ordered field list — render order is significant. */
  fields: readonly FieldSpec[];
  /** Primary submit action. */
  submit: SubmitAction;
  /** Optional secondary actions (e.g. "Cancel", "Save draft"). */
  secondaryActions?: readonly SubmitAction[];
  /**
   * Initial values overlay — keyed by field name. Merged on top of each
   * field's `defaultValue`.
   */
  initialValues?: Record<string, unknown>;
}

// ---------- Submit payload ----------

/**
 * Shape of the event the host emits when a form is submitted. Documented
 * here so consumers can type their handlers without importing core.
 */
export interface FormSubmitPayload<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> {
  formId: string;
  values: TValues;
  /** Surface id the form lived under, if any. */
  surfaceId?: string;
}
