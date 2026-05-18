import type { FormEngine } from '@stream-ui/core';
/**
 * Headless <Form.*> primitives — drive a FormEngine via React context.
 *
 * `<Form.Root engine={...}>` exposes the engine to descendants. `<Form.Field>`
 * binds value/handlers and forwards them to either its default `<input>`
 * or, with `asChild`, to a custom child via {@link Slot}.
 */
import {
  type ComponentPropsWithoutRef,
  type ElementRef,
  type FormEvent,
  type ReactNode,
  createContext,
  forwardRef,
  useContext,
} from 'react';
import { useField } from '../hooks/use-field.js';
import { Slot } from './slot.js';

const FormCtx = createContext<FormEngine | null>(null);

function useEngine(): FormEngine {
  const ctx = useContext(FormCtx);
  if (!ctx) {
    throw new Error(
      '@stream-ui/react: <Form.Field> / <Form.Submit> must be inside <Form.Root engine={...}>.',
    );
  }
  return ctx;
}

// ---------- <Form.Root> ----------

export interface FormRootProps extends Omit<ComponentPropsWithoutRef<'form'>, 'onSubmit'> {
  asChild?: boolean;
  engine: FormEngine;
  /** Called with the payload after engine validation passes. */
  onSubmitted?: (payload: Awaited<ReturnType<FormEngine['submit']>>) => void;
}

const Root = forwardRef<ElementRef<'form'>, FormRootProps>(function FormRoot(
  { asChild, engine, onSubmitted, children, ...rest },
  ref,
) {
  const Comp = asChild ? Slot : 'form';
  return (
    <FormCtx.Provider value={engine}>
      <Comp
        ref={ref}
        noValidate
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const result = await engine.submit();
          onSubmitted?.(result);
        }}
        {...rest}
      >
        {children}
      </Comp>
    </FormCtx.Provider>
  );
});

// ---------- <Form.Field> ----------

export interface FormFieldRenderProps {
  value: unknown;
  onChange: (event: unknown) => void;
  onBlur: () => void;
  error: string | null;
  errors: readonly string[];
  dirty: boolean;
  touched: boolean;
}

export type FormFieldProps = {
  name: string;
  asChild?: boolean;
  /** Default: `input`. Ignored when `asChild`. */
  as?: 'input' | 'textarea' | 'select';
  /** Render-prop override for full control. Wins over `asChild`. */
  children?: ReactNode | ((props: FormFieldRenderProps) => ReactNode);
  className?: string;
} & Omit<
  ComponentPropsWithoutRef<'input'>,
  'name' | 'value' | 'onChange' | 'onBlur' | 'children' | 'ref' | 'id'
>;

const Field = forwardRef<ElementRef<'input'>, FormFieldProps>(function FormField(
  { name, asChild, as = 'input', children, ...rest },
  ref,
) {
  const engine = useEngine();
  const binding = useField(engine, name);
  const renderProps: FormFieldRenderProps = {
    value: binding.value,
    onChange: binding.onChange,
    onBlur: binding.onBlur,
    error: binding.error,
    errors: binding.errors,
    dirty: binding.dirty,
    touched: binding.touched,
  };

  if (typeof children === 'function') {
    return <>{children(renderProps)}</>;
  }

  const ariaProps = {
    id: binding.id,
    name,
    'aria-invalid': binding.ariaInvalid,
    'aria-describedby': binding.ariaDescribedBy,
  } as const;
  const handlerProps = {
    value: (binding.value ?? '') as string,
    onChange: binding.onChange as (e: React.ChangeEvent<HTMLInputElement>) => void,
    onBlur: binding.onBlur,
  };

  if (asChild) {
    return (
      <Slot ref={ref as never} {...ariaProps} {...handlerProps} {...(rest as object)}>
        {children}
      </Slot>
    );
  }

  const Comp = as;
  return (
    <Comp
      ref={ref as never}
      {...(ariaProps as object)}
      {...(handlerProps as object)}
      {...(rest as object)}
    />
  );
});

// ---------- <Form.FieldError> ----------

export interface FormFieldErrorProps extends ComponentPropsWithoutRef<'span'> {
  asChild?: boolean;
  name: string;
}

const FieldError = forwardRef<ElementRef<'span'>, FormFieldErrorProps>(function FormFieldError(
  { asChild, name, children, ...rest },
  ref,
) {
  const engine = useEngine();
  const binding = useField(engine, name);
  if (!binding.error) return null;
  const Comp = asChild ? Slot : 'span';
  return (
    <Comp ref={ref} id={binding.errorId} role="alert" {...rest}>
      {children ?? binding.error}
    </Comp>
  );
});

// ---------- <Form.Submit> ----------

export interface FormSubmitProps extends ComponentPropsWithoutRef<'button'> {
  asChild?: boolean;
}

const Submit = forwardRef<ElementRef<'button'>, FormSubmitProps>(function FormSubmit(
  { asChild, type = 'submit', disabled, ...rest },
  ref,
) {
  const engine = useEngine();
  // Read the engine's busy/valid bits so callers don't have to.
  const state = engine.store.getSnapshot();
  const isBusy = state.status === 'validating' || state.status === 'submitting';
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      type={type}
      disabled={disabled ?? isBusy}
      data-busy={isBusy ? '' : undefined}
      {...rest}
    />
  );
});

export const Form = {
  Root,
  Field,
  FieldError,
  Submit,
};
