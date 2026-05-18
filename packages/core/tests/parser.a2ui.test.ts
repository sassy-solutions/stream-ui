import type { Surface, UISurfaceUpdate } from '@stream-ui/protocol';
import { describe, expect, it } from 'vitest';
import { applyPatch, findComponent, reduceSurfaces } from '../src/parser/a2ui.js';

const baseSurface: Surface = {
  version: '0.9',
  id: 'surface-1',
  state: { count: 0 },
  root: {
    id: 'root',
    kind: 'container',
    children: [
      { id: 'a', kind: 'text', props: { text: 'hello' } },
      {
        id: 'b',
        kind: 'column',
        children: [{ id: 'b1', kind: 'text', props: { text: 'inner' } }],
      },
    ],
  },
};

describe('reduceSurfaces', () => {
  it('inserts surface from full update', () => {
    const ev: UISurfaceUpdate = {
      type: 'UI_SURFACE_UPDATE',
      surfaceId: 'surface-1',
      surface: baseSurface,
    };
    const next = reduceSurfaces(new Map(), ev);
    expect(next.get('surface-1')).toBe(baseSurface);
  });

  it('returns same state on no-op full update', () => {
    const map = new Map([['surface-1', baseSurface]]);
    const ev: UISurfaceUpdate = {
      type: 'UI_SURFACE_UPDATE',
      surfaceId: 'surface-1',
      surface: baseSurface,
    };
    const next = reduceSurfaces(map, ev);
    expect(next).toBe(map);
  });

  it('drops patch with no base surface', () => {
    const map = new Map();
    const ev: UISurfaceUpdate = {
      type: 'UI_SURFACE_UPDATE',
      surfaceId: 'nope',
      patch: { op: 'remove-node', id: 'x' },
    };
    expect(reduceSurfaces(map, ev)).toBe(map);
  });

  it('applies replace-node patch', () => {
    const map = new Map([['surface-1', baseSurface]]);
    const ev: UISurfaceUpdate = {
      type: 'UI_SURFACE_UPDATE',
      surfaceId: 'surface-1',
      patch: {
        op: 'replace-node',
        id: 'a',
        node: { id: 'a', kind: 'text', props: { text: 'world' } },
      },
    };
    const next = reduceSurfaces(map, ev);
    const updated = next.get('surface-1')!;
    expect(updated).not.toBe(baseSurface);
    expect((updated.root.children?.[0] as { props: { text: string } }).props.text).toBe('world');
  });

  it('ignores ev with neither surface nor patch', () => {
    const map = new Map([['surface-1', baseSurface]]);
    const ev: UISurfaceUpdate = { type: 'UI_SURFACE_UPDATE', surfaceId: 'surface-1' };
    expect(reduceSurfaces(map, ev)).toBe(map);
  });
});

describe('applyPatch', () => {
  it('replaces a deep node', () => {
    const next = applyPatch(baseSurface, {
      op: 'replace-node',
      id: 'b1',
      node: { id: 'b1', kind: 'text', props: { text: 'updated' } },
    });
    expect(findComponent(next, 'b1')).toMatchObject({ props: { text: 'updated' } });
  });

  it('returns same surface when replace-node finds nothing', () => {
    expect(
      applyPatch(baseSurface, {
        op: 'replace-node',
        id: 'missing',
        node: { id: 'missing', kind: 'text' },
      }),
    ).toBe(baseSurface);
  });

  it('appends children to a parent', () => {
    const next = applyPatch(baseSurface, {
      op: 'append-children',
      parentId: 'b',
      nodes: [{ id: 'b2', kind: 'text', props: { text: 'second' } }],
    });
    expect(findComponent(next, 'b2')).toBeDefined();
    expect(findComponent(next, 'b1')).toBeDefined();
  });

  it('append-children no-ops when parent missing', () => {
    expect(
      applyPatch(baseSurface, {
        op: 'append-children',
        parentId: 'missing',
        nodes: [],
      }),
    ).toBe(baseSurface);
  });

  it('removes a node', () => {
    const next = applyPatch(baseSurface, { op: 'remove-node', id: 'b1' });
    expect(findComponent(next, 'b1')).toBeUndefined();
    expect(findComponent(next, 'b')).toBeDefined();
  });

  it('remove-node no-ops when id missing', () => {
    expect(applyPatch(baseSurface, { op: 'remove-node', id: 'missing' })).toBe(baseSurface);
  });

  it('merges state', () => {
    const next = applyPatch(baseSurface, {
      op: 'merge-state',
      state: { count: 5, extra: true },
    });
    expect(next.state).toEqual({ count: 5, extra: true });
  });

  it('sets state', () => {
    const next = applyPatch(baseSurface, {
      op: 'set-state',
      state: { fresh: 'state' },
    });
    expect(next.state).toEqual({ fresh: 'state' });
  });

  it('ignores unknown patch op', () => {
    expect(
      applyPatch(baseSurface, {
        // @ts-expect-error — unknown op
        op: 'unknown',
      }),
    ).toBe(baseSurface);
  });
});

describe('findComponent', () => {
  it('finds root', () => {
    expect(findComponent(baseSurface, 'root')?.id).toBe('root');
  });

  it('finds nested', () => {
    expect(findComponent(baseSurface, 'b1')?.id).toBe('b1');
  });

  it('returns undefined when missing', () => {
    expect(findComponent(baseSurface, 'missing')).toBeUndefined();
  });
});
