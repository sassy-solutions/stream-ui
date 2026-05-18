import type { FormEngine } from '@stream-ui/core';
import { useForm, useFormField } from '@stream-ui/core/shared-react';
import type {
  UseFormFieldResult,
  UseFormOptions,
  UseFormResult,
} from '@stream-ui/core/shared-react';
import type { FieldSpec } from '@stream-ui/protocol';
import {
  Children,
  type ReactElement,
  type ReactNode,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';

interface FormContextValue {
  engine: FormEngine;
}

const FormContext = createContext<FormContextValue | null>(null);

function useFormContext(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error('[stream-ui] Form.* primitives must be rendered inside <Form.Root>.');
  }
  return ctx;
}

export interface FormRootProps extends Omit<ViewProps, 'children'> {
  options: UseFormOptions;
  /** Render-prop or static children. */
  children: ReactNode | ((form: UseFormResult) => ReactNode);
}

const Root = forwardRef<View, FormRootProps>(function FormRoot(
  { options, children, ...rest },
  ref,
) {
  const form = useForm(options);
  const ctxValue = useMemo<FormContextValue>(() => ({ engine: form.engine }), [form.engine]);
  const rendered = typeof children === 'function' ? children(form) : children;
  return (
    <FormContext.Provider value={ctxValue}>
      <View ref={ref} {...rest}>
        {rendered}
      </View>
    </FormContext.Provider>
  );
});

/**
 * The set of props we auto-wire onto a child component based on its
 * type. Numeric `Switch`-style children get `{ value, onValueChange }`,
 * pickers get `{ selectedValue, onValueChange }`, everything else
 * (TextInput, Slider with numeric, custom) gets `{ value, onChangeText }`
 * + `onChange`/`onValueChange` fallbacks.
 */
interface WireProps {
  value?: unknown;
  onChangeText?: (text: string) => void;
  onValueChange?: (value: unknown) => void;
  selectedValue?: unknown;
  onBlur?: () => void;
  editable?: boolean;
}

function detectKind(element: ReactElement): 'switch' | 'picker' | 'text' {
  const type = element.type as { displayName?: string; name?: string } | string | undefined;
  const name = typeof type === 'string' ? type : (type?.displayName ?? type?.name ?? '');
  if (/Switch/i.test(name)) return 'switch';
  if (/Picker/i.test(name)) return 'picker';
  return 'text';
}

function buildChildProps(
  field: UseFormFieldResult,
  spec: FieldSpec | undefined,
  kind: 'switch' | 'picker' | 'text',
): WireProps {
  const onValueChange = (next: unknown) => field.setValue(next);
  switch (kind) {
    case 'switch':
      return {
        value: field.value === true,
        onValueChange,
        onBlur: field.onBlur,
      };
    case 'picker':
      return {
        selectedValue: field.value,
        onValueChange,
        onBlur: field.onBlur,
      };
    default: {
      const isNumber = spec?.kind === 'number';
      return {
        value:
          field.value == null
            ? ''
            : typeof field.value === 'string'
              ? field.value
              : String(field.value),
        onChangeText: (text: string) => {
          if (isNumber) {
            if (text === '') {
              field.setValue(undefined);
              return;
            }
            const n = Number(text);
            field.setValue(Number.isNaN(n) ? text : n);
            return;
          }
          field.setValue(text);
        },
        onValueChange,
        onBlur: field.onBlur,
      };
    }
  }
}

export interface FormFieldProps {
  name: string;
  /**
   * Render-prop receives the full field state. When omitted, children
   * are cloned with platform-appropriate handler props auto-wired.
   */
  children: ReactNode | ((field: UseFormFieldResult) => ReactNode);
}

function Field({ name, children }: FormFieldProps): ReactElement | null {
  const { engine } = useFormContext();
  const field = useFormField(engine, name);

  if (typeof children === 'function') {
    return <>{children(field)}</>;
  }

  // Static path: wire the first valid child via prop sniffing.
  const arr = Children.toArray(children);
  return (
    <>
      {arr.map((child, idx) => {
        if (!isValidElement(child)) return child;
        const kind = detectKind(child);
        const wire = buildChildProps(field, field.spec, kind);
        // Merge wire props underneath user-provided props so explicit
        // overrides win.
        const childProps = child.props as Record<string, unknown>;
        return cloneElement(child, {
          key: child.key ?? `${name}-${idx}`,
          ...wire,
          ...childProps,
        } as Record<string, unknown>);
      })}
    </>
  );
}

export interface FormErrorsProps {
  name: string;
  /** Render-prop; defaults to a debug-friendly `<View />`-free null render. */
  children: (errors: ReadonlyArray<string>) => ReactNode;
  /** Only show errors after the field has been touched. Default true. */
  touchedOnly?: boolean;
}

function Errors({ name, children, touchedOnly = true }: FormErrorsProps): ReactElement {
  const { engine } = useFormContext();
  const field = useFormField(engine, name);
  if (touchedOnly && !field.touched) {
    return <>{children([])}</>;
  }
  return <>{children(field.errors)}</>;
}

const submitContainer: ViewStyle = {};

export interface FormSubmitProps {
  /** Render-prop receives `submit` + current form state. */
  children: (api: { submit: UseFormResult['submit']; busy: boolean }) => ReactNode;
  style?: ViewProps['style'];
}

function Submit({ children, style }: FormSubmitProps): ReactElement {
  const { engine } = useFormContext();
  const submit = useCallback(() => engine.submit(), [engine]);
  const subscribe = useCallback(
    (listener: () => void) => engine.store.subscribe(listener),
    [engine],
  );
  const getBusy = useCallback(() => {
    const s = engine.store.getSnapshot().status;
    return s === 'submitting' || s === 'validating';
  }, [engine]);
  const busy = useSyncExternalStore(subscribe, getBusy, getBusy);
  return <View style={[submitContainer, style]}>{children({ submit, busy })}</View>;
}

export const Form: {
  Root: typeof Root;
  Field: typeof Field;
  Errors: typeof Errors;
  Submit: typeof Submit;
} = {
  Root,
  Field,
  Errors,
  Submit,
};

export { Root as FormRoot, Field as FormField, Errors as FormErrors, Submit as FormSubmit };
