import type { FieldSpec, FormSpec } from '@stream-ui/protocol';

export type FormValues = Record<string, unknown>;
export type FieldErrors = Record<string, string[]>;

/**
 * A validator turns a values bag into a per-field error map.
 *
 * Validators may be sync or async. The form engine treats the result
 * as authoritative: an empty error array (or absence of a key) means
 * the field is valid.
 */
export interface Validator {
  validate(values: FormValues): FieldErrors | Promise<FieldErrors>;
}

/**
 * Built-in validator derived from FieldSpec constraints. Implements the
 * JSON-Schema-flavored constraints declared in `FieldConstraints`.
 *
 * For more advanced rules, compose with a Zod (or other) adapter via
 * `composeValidators`.
 */
export function specConstraintsValidator(spec: FormSpec): Validator {
  return {
    validate(values) {
      const errors: FieldErrors = {};
      for (const field of spec.fields) {
        const value = values[field.name];
        const fieldErrors = validateField(field, value);
        if (fieldErrors.length > 0) errors[field.name] = fieldErrors;
      }
      return errors;
    },
  };
}

export function validateField(field: FieldSpec, value: unknown): string[] {
  const errors: string[] = [];
  const c = field.constraints ?? {};

  const isMissing =
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);

  if (c.required && isMissing) {
    errors.push(`${field.label ?? field.name} is required`);
    return errors;
  }

  // Empty arrays still need to pass array-bound checks (minItems).
  if (isMissing && !Array.isArray(value)) return errors;

  if (typeof value === 'string') {
    if (c.minLength !== undefined && value.length < c.minLength) {
      errors.push(`Must be at least ${c.minLength} characters`);
    }
    if (c.maxLength !== undefined && value.length > c.maxLength) {
      errors.push(`Must be at most ${c.maxLength} characters`);
    }
    if (c.pattern) {
      try {
        const re = new RegExp(c.pattern);
        if (!re.test(value)) errors.push('Invalid format');
      } catch {
        /* malformed pattern — ignore */
      }
    }
    if (field.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push('Invalid email');
    }
    if (field.kind === 'url') {
      try {
        new URL(value);
      } catch {
        errors.push('Invalid URL');
      }
    }
  }

  if (typeof value === 'number') {
    if (c.min !== undefined && value < c.min) errors.push(`Must be ≥ ${c.min}`);
    if (c.max !== undefined && value > c.max) errors.push(`Must be ≤ ${c.max}`);
    if (c.multipleOf !== undefined && c.multipleOf !== 0) {
      const ratio = value / c.multipleOf;
      if (Math.abs(ratio - Math.round(ratio)) > 1e-9) {
        errors.push(`Must be a multiple of ${c.multipleOf}`);
      }
    }
    if (field.kind === 'integer' && !Number.isInteger(value)) {
      errors.push('Must be an integer');
    }
  }

  if (Array.isArray(value)) {
    if (c.minItems !== undefined && value.length < c.minItems) {
      errors.push(`Select at least ${c.minItems}`);
    }
    if (c.maxItems !== undefined && value.length > c.maxItems) {
      errors.push(`Select at most ${c.maxItems}`);
    }
  }

  return errors;
}

/**
 * Compose multiple validators. Errors from each are merged per-field.
 * Async validators are awaited concurrently.
 */
export function composeValidators(...validators: Validator[]): Validator {
  return {
    async validate(values) {
      const results = await Promise.all(validators.map((v) => v.validate(values)));
      const merged: FieldErrors = {};
      for (const r of results) {
        for (const [k, v] of Object.entries(r)) {
          if (v.length === 0) continue;
          const existing = merged[k] ?? [];
          merged[k] = existing.concat(v);
        }
      }
      return merged;
    },
  };
}
