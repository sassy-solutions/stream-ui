import { describe, expect, it } from 'vitest';
import { IncrementalJsonParser, parsePartial } from '../src/parser/incremental-json.js';

describe('parsePartial — complete inputs', () => {
  it.each([
    ['{}', {}],
    ['[]', []],
    ['{"a":1}', { a: 1 }],
    ['[1,2,3]', [1, 2, 3]],
    ['"hello"', 'hello'],
    ['true', true],
    ['false', false],
    ['null', null],
    ['42', 42],
    ['-3.14', -3.14],
    ['1e3', 1000],
    ['{"a":{"b":[1,2]}}', { a: { b: [1, 2] } }],
  ])('parses %s', (input, expected) => {
    expect(parsePartial(input)).toEqual(expected);
  });
});

describe('parsePartial — partial inputs', () => {
  it('repairs unterminated object', () => {
    expect(parsePartial('{"a":1')).toEqual({ a: 1 });
  });

  it('drops dangling key with no colon', () => {
    expect(parsePartial('{"a"')).toEqual({});
  });

  it('drops dangling key with colon but no value', () => {
    expect(parsePartial('{"a":')).toEqual({});
  });

  it('drops partial string value', () => {
    expect(parsePartial('{"a":"hel')).toEqual({});
  });

  it('keeps complete key/value pairs preceding partial', () => {
    expect(parsePartial('{"a":1,"b":"hel')).toEqual({ a: 1 });
  });

  it('repairs unterminated array', () => {
    expect(parsePartial('[1,2')).toEqual([1, 2]);
  });

  it('drops partial number in array', () => {
    // "1e" is not a valid number — keep only the safe prefix.
    const result = parsePartial('[1,2,1e');
    expect(result).toEqual([1, 2]);
  });

  it('repairs nested structures', () => {
    expect(parsePartial('{"a":[1,{"b":2')).toEqual({ a: [1, { b: 2 }] });
  });

  it('handles whitespace', () => {
    expect(parsePartial('  { "a" : 1 ')).toEqual({ a: 1 });
  });

  it('returns undefined on empty input', () => {
    expect(parsePartial('')).toBeUndefined();
    expect(parsePartial('   ')).toBeUndefined();
  });

  it('returns undefined on null/undefined-ish', () => {
    expect(parsePartial(null as unknown as string)).toBeUndefined();
  });

  it('handles escaped quotes inside strings', () => {
    expect(parsePartial('{"a":"hi \\"bob\\""}')).toEqual({ a: 'hi "bob"' });
  });

  it('drops partial string containing escape', () => {
    expect(parsePartial('{"a":"hi \\"bob')).toEqual({});
  });

  it('repairs trailing comma', () => {
    expect(parsePartial('[1,2,')).toEqual([1, 2]);
  });

  it('handles boolean partials gracefully', () => {
    // "tru" is incomplete — drop.
    expect(parsePartial('[1,tru')).toEqual([1]);
  });

  it('handles deeply nested unterminated', () => {
    expect(parsePartial('{"a":{"b":{"c":{"d":1')).toEqual({ a: { b: { c: { d: 1 } } } });
  });

  it('repairs just an open brace to empty object', () => {
    expect(parsePartial('{')).toEqual({});
  });

  it('handles emoji and unicode in strings', () => {
    expect(parsePartial('{"a":"🚀hello"}')).toEqual({ a: '🚀hello' });
  });
});

describe('IncrementalJsonParser', () => {
  it('streams a tool-call args delta', () => {
    const p = new IncrementalJsonParser();
    expect(p.push('{"city":')).toEqual({});
    expect(p.push('"Par')).toEqual({});
    expect(p.push('is"')).toEqual({ city: 'Paris' });
    expect(p.push(',"days":')).toEqual({ city: 'Paris' });
    expect(p.push('3}')).toEqual({ city: 'Paris', days: 3 });
    expect(p.raw).toBe('{"city":"Paris","days":3}');
  });

  it('resets buffer', () => {
    const p = new IncrementalJsonParser();
    p.push('{"a":1}');
    p.reset();
    expect(p.raw).toBe('');
    expect(p.push('[]')).toEqual([]);
  });
});
