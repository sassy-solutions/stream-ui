import type { Component, Surface, SurfacePatch, UISurfaceUpdate } from '@stream-ui/protocol';

/**
 * Fold a stream of `UISurfaceUpdate` events into a `Map<surfaceId, Surface>`.
 *
 * Each update either supplies a full surface (replacement) or an
 * incremental `SurfacePatch` operating on the previously-known surface.
 *
 * The reducer is pure: it returns a new map when something changes and
 * leaves it referentially-equal otherwise.
 */
export function reduceSurfaces(
  state: ReadonlyMap<string, Surface>,
  event: UISurfaceUpdate,
): ReadonlyMap<string, Surface> {
  if (event.surface) {
    if (state.get(event.surfaceId) === event.surface) return state;
    const next = new Map(state);
    next.set(event.surfaceId, event.surface);
    return next;
  }
  if (event.patch) {
    const existing = state.get(event.surfaceId);
    if (!existing) return state; // Patch with no base — drop.
    const patched = applyPatch(existing, event.patch);
    if (patched === existing) return state;
    const next = new Map(state);
    next.set(event.surfaceId, patched);
    return next;
  }
  return state;
}

/** Apply a single `SurfacePatch` op to a surface, returning a new surface. */
export function applyPatch(surface: Surface, patch: SurfacePatch): Surface {
  switch (patch.op) {
    case 'replace-node': {
      const root = replaceNode(surface.root, patch.id, patch.node);
      if (root === surface.root) return surface;
      return { ...surface, root };
    }
    case 'append-children': {
      const root = appendChildren(surface.root, patch.parentId, patch.nodes);
      if (root === surface.root) return surface;
      return { ...surface, root };
    }
    case 'remove-node': {
      const root = removeNode(surface.root, patch.id);
      if (root === surface.root) return surface;
      return { ...surface, root };
    }
    case 'merge-state': {
      const state = { ...(surface.state ?? {}), ...patch.state };
      return { ...surface, state: state as Surface['state'] };
    }
    case 'set-state': {
      return { ...surface, state: patch.state as Surface['state'] };
    }
    default:
      return surface;
  }
}

function replaceNode(node: Component, id: string, replacement: Component): Component {
  if (node.id === id) return replacement;
  if (!node.children || node.children.length === 0) return node;
  let mutated = false;
  const children = node.children.map((child) => {
    const next = replaceNode(child, id, replacement);
    if (next !== child) mutated = true;
    return next;
  });
  if (!mutated) return node;
  return { ...node, children };
}

function appendChildren(
  node: Component,
  parentId: string,
  toAppend: readonly Component[],
): Component {
  if (node.id === parentId) {
    return { ...node, children: [...(node.children ?? []), ...toAppend] };
  }
  if (!node.children || node.children.length === 0) return node;
  let mutated = false;
  const children = node.children.map((child) => {
    const next = appendChildren(child, parentId, toAppend);
    if (next !== child) mutated = true;
    return next;
  });
  if (!mutated) return node;
  return { ...node, children };
}

function removeNode(node: Component, id: string): Component {
  if (!node.children || node.children.length === 0) return node;
  let mutated = false;
  const filtered: Component[] = [];
  for (const child of node.children) {
    if (child.id === id) {
      mutated = true;
      continue;
    }
    const next = removeNode(child, id);
    if (next !== child) mutated = true;
    filtered.push(next);
  }
  if (!mutated) return node;
  return { ...node, children: filtered };
}

/**
 * Find a component by id in a surface tree. Depth-first, returns `undefined`
 * if not found.
 */
export function findComponent(surface: Surface, id: string): Component | undefined {
  return findIn(surface.root, id);
}

function findIn(node: Component, id: string): Component | undefined {
  if (node.id === id) return node;
  if (!node.children) return undefined;
  for (const c of node.children) {
    const hit = findIn(c, id);
    if (hit) return hit;
  }
  return undefined;
}
