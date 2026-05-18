import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../src/state/store.js';

describe('createStore', () => {
  it('returns initial snapshot', () => {
    const s = createStore(1);
    expect(s.getSnapshot()).toBe(1);
  });

  it('notifies subscribers on set', () => {
    const s = createStore(0);
    const fn = vi.fn();
    s.subscribe(fn);
    s.set(1);
    expect(fn).toHaveBeenCalledOnce();
    expect(s.getSnapshot()).toBe(1);
  });

  it('skips notification when state is reference-equal', () => {
    const obj = { a: 1 };
    const s = createStore(obj);
    const fn = vi.fn();
    s.subscribe(fn);
    s.set(obj);
    expect(fn).not.toHaveBeenCalled();
  });

  it('update applies an updater fn', () => {
    const s = createStore(1);
    s.update((n) => n + 1);
    expect(s.getSnapshot()).toBe(2);
  });

  it('update no-ops if returns same reference', () => {
    const obj = { a: 1 };
    const s = createStore(obj);
    const fn = vi.fn();
    s.subscribe(fn);
    s.update((x) => x);
    expect(fn).not.toHaveBeenCalled();
  });

  it('unsubscribe stops notifications', () => {
    const s = createStore(0);
    const fn = vi.fn();
    const unsub = s.subscribe(fn);
    unsub();
    s.set(1);
    expect(fn).not.toHaveBeenCalled();
  });
});
