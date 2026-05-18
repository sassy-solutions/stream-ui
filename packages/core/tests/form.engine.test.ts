import type { FormSpec } from '@stream-ui/protocol';
import { describe, expect, it, vi } from 'vitest';
import { createFormEngine, initialValues } from '../src/form/engine.js';
import {
  composeValidators,
  specConstraintsValidator,
  validateField,
} from '../src/form/validator.js';

const spec: FormSpec = {
  id: 'signup',
  fields: [
    {
      name: 'email',
      kind: 'email',
      label: 'Email',
      constraints: { required: true, maxLength: 100 },
    },
    {
      name: 'password',
      kind: 'password',
      label: 'Password',
      constraints: { required: true, minLength: 8 },
    },
    {
      name: 'age',
      kind: 'integer',
      constraints: { min: 13, max: 130 },
    },
    {
      name: 'tags',
      kind: 'multiselect',
      constraints: { minItems: 1, maxItems: 3 },
    },
    {
      name: 'newsletter',
      kind: 'boolean',
      defaultValue: false,
    },
  ],
  submit: { target: 'event:signup' },
};

describe('initialValues', () => {
  it('picks up literal defaults', () => {
    const vals = initialValues(spec);
    expect(vals).toEqual({ newsletter: false });
  });

  it('merges spec.initialValues', () => {
    const vals = initialValues({
      ...spec,
      initialValues: { email: 'a@b.c' },
    });
    expect(vals.email).toBe('a@b.c');
    expect(vals.newsletter).toBe(false);
  });

  it('unwraps a literal DataBinding default', () => {
    const vals = initialValues({
      ...spec,
      fields: [
        {
          name: 'x',
          kind: 'text',
          defaultValue: { kind: 'literal', value: 'hi' },
        },
      ],
    });
    expect(vals.x).toBe('hi');
  });

  it('drops ref/expr bindings as defaults', () => {
    const vals = initialValues({
      ...spec,
      fields: [
        {
          name: 'x',
          kind: 'text',
          defaultValue: { kind: 'ref', path: '$.x' as any },
        },
      ],
    });
    expect(vals.x).toBeUndefined();
  });
});

describe('validateField', () => {
  it('flags required missing', () => {
    expect(validateField(spec.fields[0]!, undefined)).toContain('Email is required');
  });

  it('passes when required is filled', () => {
    expect(validateField(spec.fields[0]!, 'a@b.c')).toEqual([]);
  });

  it('flags invalid email', () => {
    expect(validateField(spec.fields[0]!, 'not-an-email')).toContain('Invalid email');
  });

  it('flags too-short string', () => {
    expect(validateField(spec.fields[1]!, 'short')).toContain('Must be at least 8 characters');
  });

  it('flags too-long string', () => {
    expect(validateField(spec.fields[0]!, 'a'.repeat(200))).toContain(
      'Must be at most 100 characters',
    );
  });

  it('flags number below min', () => {
    expect(validateField(spec.fields[2]!, 5)).toContain('Must be ≥ 13');
  });

  it('flags number above max', () => {
    expect(validateField(spec.fields[2]!, 200)).toContain('Must be ≤ 130');
  });

  it('flags non-integer for integer kind', () => {
    expect(validateField(spec.fields[2]!, 13.5)).toContain('Must be an integer');
  });

  it('flags too few items', () => {
    expect(validateField(spec.fields[3]!, [])).toContain('Select at least 1');
    expect(validateField(spec.fields[3]!, ['x', 'y', 'z', 'w'])).toContain('Select at most 3');
  });

  it('flags multipleOf violation', () => {
    expect(
      validateField({ name: 'n', kind: 'number', constraints: { multipleOf: 0.25 } }, 0.3),
    ).toContain('Must be a multiple of 0.25');
  });

  it('flags invalid URL', () => {
    expect(validateField({ name: 'u', kind: 'url' }, 'not a url')).toContain('Invalid URL');
  });

  it('flags regex mismatch', () => {
    expect(
      validateField({ name: 'code', kind: 'text', constraints: { pattern: '^[A-Z]{3}$' } }, 'abc'),
    ).toContain('Invalid format');
  });

  it('ignores malformed regex pattern', () => {
    expect(
      validateField({ name: 'code', kind: 'text', constraints: { pattern: '[' } }, 'abc'),
    ).toEqual([]);
  });
});

describe('createFormEngine — interaction', () => {
  it('exposes initial state', () => {
    const engine = createFormEngine({ spec });
    const s = engine.store.getSnapshot();
    expect(s.status).toBe('idle');
    expect(s.values.newsletter).toBe(false);
    expect(s.isValid).toBe(false); // required fields are empty
  });

  it('setField updates values + dirty', () => {
    const engine = createFormEngine({ spec });
    engine.setField('email', 'a@b.c');
    const s = engine.store.getSnapshot();
    expect(s.values.email).toBe('a@b.c');
    expect(s.dirty.email).toBe(true);
  });

  it('blur marks touched and runs validation', async () => {
    const engine = createFormEngine({ spec });
    engine.blur('email');
    // microtask for the async validate
    await Promise.resolve();
    await Promise.resolve();
    const s = engine.store.getSnapshot();
    expect(s.touched.email).toBe(true);
    expect(s.errors.email?.[0]).toContain('required');
  });

  it('reset returns to initial', () => {
    const engine = createFormEngine({ spec });
    engine.setField('email', 'a@b.c');
    engine.reset();
    const s = engine.store.getSnapshot();
    expect(s.values.email).toBeUndefined();
    expect(s.dirty).toEqual({});
    expect(s.touched).toEqual({});
  });

  it('validate produces errors for invalid values', async () => {
    const engine = createFormEngine({ spec });
    const errors = await engine.validate();
    expect(errors.email?.length).toBeGreaterThan(0);
    expect(engine.store.getSnapshot().status).toBe('error');
  });

  it('submit blocks when invalid and marks all fields touched', async () => {
    const engine = createFormEngine({ spec });
    const onSubmit = vi.fn();
    const engineWithHandler = createFormEngine({ spec, onSubmit });
    const result = await engineWithHandler.submit();
    expect(result).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
    const s = engineWithHandler.store.getSnapshot();
    expect(s.touched.email).toBe(true);
    expect(s.touched.password).toBe(true);
    expect(engine).toBeDefined();
  });

  it('submit succeeds with valid values and calls onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const engine = createFormEngine({ spec, onSubmit, surfaceId: 'surface-1' });
    engine.setField('email', 'a@b.co');
    engine.setField('password', 'longpassword');
    engine.setField('age', 30);
    engine.setField('tags', ['x']);
    const result = await engine.submit();
    expect(result).not.toBeNull();
    expect(result?.formId).toBe('signup');
    expect(result?.surfaceId).toBe('surface-1');
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(engine.store.getSnapshot().status).toBe('submitted');
  });

  it('captures onSubmit error in submitError', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'));
    const engine = createFormEngine({ spec, onSubmit });
    engine.setField('email', 'a@b.co');
    engine.setField('password', 'longpassword');
    const result = await engine.submit();
    expect(result).toBeNull();
    const s = engine.store.getSnapshot();
    expect(s.status).toBe('error');
    expect(s.submitError).toBe('boom');
  });

  it('store subscribers fire on change', () => {
    const engine = createFormEngine({ spec });
    const listener = vi.fn();
    const unsub = engine.store.subscribe(listener);
    engine.setField('email', 'a@b.co');
    expect(listener).toHaveBeenCalled();
    unsub();
    engine.setField('email', 'c@d.ef');
    // After unsubscribe, listener should not be called more
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('dispose is a safe no-op', () => {
    const engine = createFormEngine({ spec });
    expect(() => engine.dispose()).not.toThrow();
  });
});

describe('composeValidators', () => {
  it('merges errors from multiple validators', async () => {
    const v1 = specConstraintsValidator(spec);
    const v2 = {
      validate() {
        return { email: ['extra rule failed'] };
      },
    };
    const merged = composeValidators(v1, v2);
    const errors = await merged.validate({});
    expect(errors.email).toEqual(
      expect.arrayContaining(['Email is required', 'extra rule failed']),
    );
  });
});
