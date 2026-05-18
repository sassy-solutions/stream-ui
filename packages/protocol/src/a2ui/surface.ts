/**
 * A2UI v0.9 surface types.
 *
 * Source: https://a2ui.org/ — the Agent-to-UI protocol.
 *
 * A2UI is a JSON description language for agent-rendered UI. A `Surface`
 * is a tree of `Component`s. Components carry `props` and `children`,
 * and may bind to `DataBinding` paths that resolve against a surface's
 * `state` blob.
 *
 * v0.9 is a moving target; we model the load-bearing parts and leave
 * room for forward-compat unknown fields (Component is intentionally
 * open via index signature on `props`).
 *
 * Types-only — no runtime emit.
 */

import type { FormSpec } from './form.js';

// ---------- Data binding ----------

/**
 * JSONPath-like binding string. v0.9 uses dot/bracket syntax e.g.
 * `$.user.name`, `$.items[0].price`. We keep it as an opaque branded
 * string for type-safety without runtime parsing.
 */
export type BindingPath = string & { readonly __brand: 'BindingPath' };

/** Construct a binding path without a runtime helper. */
export type Bind<P extends string> = P & { readonly __brand: 'BindingPath' };

/**
 * A data binding either resolves to a literal value or references state.
 * Most props accept `T | DataBinding<T>` at the type level; consumers
 * decide what to do with the binding at render time.
 */
export type DataBinding<T = unknown> =
  | { kind: 'literal'; value: T }
  | { kind: 'ref'; path: BindingPath }
  | { kind: 'expr'; expression: string };

/** Helper alias: a prop value that may itself be a binding. */
export type Bindable<T> = T | DataBinding<T>;

// ---------- Components ----------

/**
 * Standard A2UI component kinds in v0.9. The spec also allows extension
 * kinds prefixed with `x-`; we widen the type with `string` to permit
 * those without forcing consumers to fork the union.
 */
export type ComponentKind =
  | 'container'
  | 'row'
  | 'column'
  | 'stack'
  | 'text'
  | 'heading'
  | 'image'
  | 'button'
  | 'link'
  | 'input'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'list'
  | 'card'
  | 'divider'
  | 'spacer'
  | 'icon'
  | 'form'
  // Extension escape hatch — vendors use `x-foo` etc.
  | (string & {});

export interface ComponentBase {
  /** Stable id within the surface; required for patching. */
  id: string;
  kind: ComponentKind;
  /** Free-form bag of typed props; bindable per-prop at runtime. */
  props?: Record<string, Bindable<unknown>>;
  /** Visibility binding — render iff truthy. */
  visibleIf?: DataBinding<boolean>;
  /** Repeater binding — render children once per item in the bound array. */
  forEach?: DataBinding<readonly unknown[]>;
  /** Nested children. */
  children?: Component[];
}

/**
 * The `form` extension is first-class in stream-ui: when a component's
 * kind is `"form"`, the props carry a strongly-typed FormSpec under
 * the `spec` key. This is the one specialization we lock down at the
 * type level; everything else uses ComponentBase.
 */
export interface FormComponent extends ComponentBase {
  kind: 'form';
  props: {
    spec: FormSpec;
    [key: string]: Bindable<unknown> | FormSpec;
  };
}

export type Component = ComponentBase | FormComponent;

// ---------- Surface ----------

export interface Surface<TState = Record<string, unknown>> {
  /** Protocol version this surface targets. */
  version: '0.9';
  /** Stable surface id for AG-UI carrier addressing. */
  id: string;
  /** Optional human-readable title (e.g. tab label, modal heading). */
  title?: string;
  /** Initial state — bindings resolve against this object. */
  state?: TState;
  /** Root component tree. */
  root: Component;
}

// ---------- Incremental patches ----------

/**
 * Coarse-grained surface patch. v0.9 doesn't fix a wire format, so we
 * model the operations the engine actually needs: replace a subtree
 * by component id, append children, remove a node, or merge state.
 */
export type SurfacePatch =
  | { op: 'replace-node'; id: string; node: Component }
  | { op: 'append-children'; parentId: string; nodes: Component[] }
  | { op: 'remove-node'; id: string }
  | { op: 'merge-state'; state: Record<string, unknown> }
  | { op: 'set-state'; state: Record<string, unknown> };
