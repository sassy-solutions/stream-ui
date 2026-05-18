/**
 * Internal Slot — zero-dep Radix-style `asChild` primitive.
 *
 * Clones the single child element, forwarding refs and merging props.
 * - `ref` is mergeRef'd between forwarded ref + child's existing ref.
 * - Event handlers compose: child handler runs first; slot handler runs
 *   only if the child handler does not call `preventDefault()`.
 * - `style` and `className` shallow-merge (slot underneath, child wins).
 * - Other slot props apply only when the child does not define them.
 */
import {
  Children,
  type ReactElement,
  type ReactNode,
  type Ref,
  cloneElement,
  forwardRef,
  isValidElement,
} from 'react';

type AnyProps = Record<string, unknown>;
type AnyRef<T = unknown> = Ref<T> | undefined;

interface SlotProps {
  children?: ReactNode;
  [key: string]: unknown;
}

export const Slot = forwardRef<unknown, SlotProps>(function Slot(
  { children, ...slotProps },
  forwardedRef,
) {
  if (!isValidElement(children)) {
    // React.Children.only would throw here too — be explicit.
    return null;
  }
  const child = Children.only(children) as ReactElement<AnyProps>;
  const childProps: AnyProps = (child.props ?? {}) as AnyProps;
  // React 19 moves `ref` to `props.ref`; React 18 keeps it on `element.ref`.
  // We read from props first (modern), then fall back without touching
  // `element.ref` directly to avoid React 19's deprecation warning.
  const childRef: AnyRef = (childProps as { ref?: AnyRef }).ref ?? undefined;
  const merged = mergeProps(slotProps, childProps);
  merged.ref = mergeRefs(forwardedRef as AnyRef, childRef);
  return cloneElement(child, merged);
});

export function mergeRefs<T>(...refs: Array<AnyRef<T>>): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        (ref as { current: T | null }).current = node;
      }
    }
  };
}

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const out: AnyProps = { ...childProps };
  for (const key of Object.keys(slotProps)) {
    const slotVal = slotProps[key];
    const childVal = childProps[key];
    if (key === 'style') {
      out.style = { ...(slotVal as object), ...(childVal as object) };
    } else if (key === 'className') {
      out.className = [slotVal, childVal].filter(Boolean).join(' ');
    } else if (/^on[A-Z]/.test(key) && typeof slotVal === 'function') {
      out[key] = composeHandlers(
        childVal as ((...args: unknown[]) => unknown) | undefined,
        slotVal as (...args: unknown[]) => unknown,
      );
    } else if (childVal === undefined) {
      out[key] = slotVal;
    }
  }
  return out;
}

function composeHandlers(
  childHandler: ((...args: unknown[]) => unknown) | undefined,
  slotHandler: (...args: unknown[]) => unknown,
) {
  return (...args: unknown[]) => {
    childHandler?.(...args);
    const ev = args[0] as { defaultPrevented?: boolean } | undefined;
    if (ev?.defaultPrevented) return undefined;
    return slotHandler(...args);
  };
}
