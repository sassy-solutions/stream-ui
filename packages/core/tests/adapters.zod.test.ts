import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodValidator } from '../src/adapters/zod.js';

describe('zodValidator', () => {
  it('returns empty errors on success', () => {
    const schema = z.object({ name: z.string().min(1) });
    const v = zodValidator(schema);
    expect(v.validate({ name: 'sacha' })).toEqual({});
  });

  it('buckets errors by path[0]', () => {
    const schema = z.object({
      name: z.string().min(2),
      age: z.number().int().min(13),
    });
    const v = zodValidator(schema);
    const result = v.validate({ name: '', age: 8 });
    expect(Object.keys(result).sort()).toEqual(['age', 'name']);
    expect(result.name!.length).toBeGreaterThan(0);
    expect(result.age!.length).toBeGreaterThan(0);
  });

  it('routes top-level issues to "_root"', () => {
    const schema = z.string();
    const v = zodValidator(schema);
    const result = v.validate({} as unknown as string);
    expect(result._root).toBeDefined();
  });

  it('applies custom formatter', () => {
    const schema = z.object({ name: z.string().min(2) });
    const v = zodValidator(schema, { formatIssue: () => 'NOPE' });
    expect(v.validate({ name: '' }).name).toEqual(['NOPE']);
  });
});
