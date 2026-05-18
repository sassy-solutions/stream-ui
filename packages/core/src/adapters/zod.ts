/**
 * Optional Zod adapter — keeps `zod` out of the main entry's dep graph.
 *
 * Consumers import via `@stream-ui/core/adapters/zod`. Zod is listed
 * in `peerDependenciesMeta` as optional, so installing this package
 * does not pull zod by default.
 */

import type { FieldErrors, FormValues, Validator } from '../form/validator.js';

// Type-only import — no runtime emit from zod.
import type { ZodIssue, ZodTypeAny } from 'zod';

export interface ZodAdapterOptions {
  /**
   * Map a Zod issue to a human-readable string. Defaults to `issue.message`.
   * Receives the raw issue so callers can localize, prefix, etc.
   */
  formatIssue?: (issue: ZodIssue) => string;
}

/**
 * Build a `Validator` from a Zod schema. The schema's `safeParse(values)`
 * is run on each call; issues are bucketed by their `path[0]` field name.
 */
export function zodValidator(schema: ZodTypeAny, opts: ZodAdapterOptions = {}): Validator {
  const format = opts.formatIssue ?? ((i: ZodIssue) => i.message);
  return {
    validate(values: FormValues): FieldErrors {
      const result = schema.safeParse(values);
      if (result.success) return {};
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? '_root');
        const existing = errors[key] ?? [];
        existing.push(format(issue));
        errors[key] = existing;
      }
      return errors;
    },
  };
}
