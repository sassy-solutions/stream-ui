import { createFormEngine } from '@stream-ui/core';
import type { FormSpec } from '@stream-ui/protocol';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useField } from '../src/hooks/use-field.js';

const spec: FormSpec = {
  id: 'demo',
  fields: [
    { name: 'email', kind: 'email', constraints: { required: true } },
    { name: 'opt', kind: 'checkbox' },
  ],
  submit: { target: 'tool:submit' },
};

describe('useField', () => {
  it('returns value, onChange, onBlur and stable id', () => {
    const engine = createFormEngine({ spec });
    const { result } = renderHook(() => useField(engine, 'email'));
    expect(result.current.value).toBeUndefined();
    expect(result.current.touched).toBe(false);
    expect(result.current.id).toMatch(/email/);
    expect(result.current.errorId).toMatch(/error$/);
  });

  it('onChange unwraps input events', () => {
    const engine = createFormEngine({ spec });
    const { result } = renderHook(() => useField(engine, 'email'));
    act(() => {
      result.current.onChange({ target: { value: 'a@b.co', type: 'email' } });
    });
    expect(engine.store.getSnapshot().values.email).toBe('a@b.co');
  });

  it('onChange unwraps checkbox events', () => {
    const engine = createFormEngine({ spec });
    const { result } = renderHook(() => useField(engine, 'opt'));
    act(() => {
      result.current.onChange({ target: { type: 'checkbox', checked: true } });
    });
    expect(engine.store.getSnapshot().values.opt).toBe(true);
  });

  it('onChange passes raw values through unchanged', () => {
    const engine = createFormEngine({ spec });
    const { result } = renderHook(() => useField(engine, 'email'));
    act(() => {
      result.current.onChange('plain');
    });
    expect(engine.store.getSnapshot().values.email).toBe('plain');
  });

  it('blur triggers validation and sets touched', async () => {
    const engine = createFormEngine({ spec });
    const { result, rerender } = renderHook(() => useField(engine, 'email'));
    await act(async () => {
      result.current.onBlur();
      await Promise.resolve();
    });
    rerender();
    expect(result.current.touched).toBe(true);
    expect(result.current.error).toMatch(/required/i);
    expect(result.current.ariaInvalid).toBe('true');
    expect(result.current.ariaDescribedBy).toBe(result.current.errorId);
  });
});
