import { fireEvent, render, screen } from '@testing-library/react';
import { createRef, forwardRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Slot, mergeRefs } from '../src/primitives/slot.js';

describe('Slot', () => {
  it('forwards refs to the underlying child', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Slot ref={ref as never} data-testid="slotted">
        <button type="button">click</button>
      </Slot>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.getAttribute('data-testid')).toBe('slotted');
  });

  it('merges existing child ref with forwarded ref', () => {
    const outer = createRef<HTMLButtonElement>();
    const inner = createRef<HTMLButtonElement>();
    render(
      <Slot ref={outer as never}>
        <button type="button" ref={inner} />
      </Slot>,
    );
    expect(outer.current).toBe(inner.current);
  });

  it('composes event handlers: child handler runs first, then slot handler', () => {
    const order: string[] = [];
    render(
      <Slot onClick={() => order.push('slot')}>
        <button type="button" onClick={() => order.push('child')}>
          click
        </button>
      </Slot>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(order).toEqual(['child', 'slot']);
  });

  it('respects preventDefault — slot handler skipped when child calls it', () => {
    const slotHandler = vi.fn();
    render(
      <Slot onClick={slotHandler}>
        <button type="button" onClick={(e) => e.preventDefault()}>
          click
        </button>
      </Slot>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(slotHandler).not.toHaveBeenCalled();
  });

  it('merges className and style with child winning conflicts', () => {
    render(
      <Slot className="slot-cls" style={{ color: 'red', padding: 4 }}>
        <button type="button" className="child-cls" style={{ color: 'blue' }}>
          x
        </button>
      </Slot>,
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('slot-cls');
    expect(btn.className).toContain('child-cls');
    expect(btn.style.color).toBe('blue');
    expect(btn.style.padding).toBe('4px');
  });

  it('mergeRefs invokes function refs and assigns object refs', () => {
    const fn = vi.fn();
    const obj = createRef<HTMLDivElement>();
    const merged = mergeRefs<HTMLDivElement>(fn, obj);
    const node = document.createElement('div');
    merged(node as HTMLDivElement);
    expect(fn).toHaveBeenCalledWith(node);
    expect(obj.current).toBe(node);
  });

  it('returns null when child is not a valid element', () => {
    const { container } = render(<Slot>{null}</Slot>);
    expect(container.firstChild).toBeNull();
  });

  it('forwards ref through forwardRef child', () => {
    const Inner = forwardRef<HTMLButtonElement>(function Inner(props, ref) {
      return <button type="button" ref={ref} {...props} />;
    });
    const ref = createRef<HTMLButtonElement>();
    render(
      <Slot ref={ref as never}>
        <Inner />
      </Slot>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
