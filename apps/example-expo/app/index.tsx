import type { ChatClient } from '@stream-ui/core';
import type {
  AgUiEvent,
  FieldOption,
  FieldSpec,
  FormSpec,
  FormSubmitPayload,
} from '@stream-ui/protocol';
import { AG_UI_EVENT_TYPES } from '@stream-ui/protocol';
import { Chat, Form, useChatClient, useSurface } from '@stream-ui/react-native';
import type { UseFormFieldResult } from '@stream-ui/react-native';
import { agUiFormFixture, checkoutFormSpec, createMockTransport } from '@stream-ui/testing';
import { useMemo } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

const SURFACE_ID = 'checkout-surface';

const INTRO_MESSAGE_ID = 'msg-intro';
const FOLLOWUP_MESSAGE_ID = 'msg-followup';

/**
 * Hand-crafted event script: a short assistant intro, then the checkout
 * form surface, then a closing message. Replayed through
 * `createMockTransport` with a 50–150ms jitter to mimic an LLM stream.
 */
function buildScript(): AgUiEvent[] {
  const formEvents = agUiFormFixture(checkoutFormSpec, {
    surfaceId: SURFACE_ID,
    runId: 'run-1',
    withRunFraming: false,
  });

  const introChunks = ['Sure — ', 'let me pull up the ', 'checkout form ', 'for you.'];
  const followupChunks = ['When you’re ready, ', 'tap "Place order" ', 'and I’ll process it.'];

  const intro: AgUiEvent[] = [
    {
      type: AG_UI_EVENT_TYPES.TEXT_MESSAGE_START,
      messageId: INTRO_MESSAGE_ID,
      role: 'assistant',
    },
    ...introChunks.map<AgUiEvent>((delta) => ({
      type: AG_UI_EVENT_TYPES.TEXT_MESSAGE_CONTENT,
      messageId: INTRO_MESSAGE_ID,
      delta,
    })),
    { type: AG_UI_EVENT_TYPES.TEXT_MESSAGE_END, messageId: INTRO_MESSAGE_ID },
  ];

  const followup: AgUiEvent[] = [
    {
      type: AG_UI_EVENT_TYPES.TEXT_MESSAGE_START,
      messageId: FOLLOWUP_MESSAGE_ID,
      role: 'assistant',
    },
    ...followupChunks.map<AgUiEvent>((delta) => ({
      type: AG_UI_EVENT_TYPES.TEXT_MESSAGE_CONTENT,
      messageId: FOLLOWUP_MESSAGE_ID,
      delta,
    })),
    { type: AG_UI_EVENT_TYPES.TEXT_MESSAGE_END, messageId: FOLLOWUP_MESSAGE_ID },
  ];

  return [
    { type: AG_UI_EVENT_TYPES.RUN_STARTED, runId: 'run-1' },
    ...intro,
    ...formEvents,
    ...followup,
    { type: AG_UI_EVENT_TYPES.RUN_FINISHED, runId: 'run-1', reason: 'stop' },
  ];
}

function useDemoClient(): ChatClient {
  const { client } = useChatClient(
    useMemo(() => {
      const script = buildScript();
      const transport = createMockTransport({
        script,
        delayMs: () => 50 + Math.floor(Math.random() * 100),
      });
      return { transport };
    }, []),
  );
  return client;
}

export default function ChatScreen() {
  const client = useDemoClient();
  return (
    <Chat.Root client={client} style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Conversation />
        <CheckoutForm client={client} />
      </ScrollView>
      <Chat.Composer
        placeholder="Ask the agent…"
        placeholderTextColor="#5f6aa1"
        containerStyle={styles.composerContainer}
        style={styles.composerInput}
      />
    </Chat.Root>
  );
}

function Conversation() {
  return (
    <Chat.Messages
      style={styles.messagesList}
      renderMessage={(message) => (
        <View
          style={[
            styles.bubble,
            message.role === 'assistant' ? styles.bubbleAssistant : styles.bubbleUser,
          ]}
        >
          <Text style={styles.bubbleText}>{message.text || '…'}</Text>
        </View>
      )}
      scrollEnabled={false}
    />
  );
}

/**
 * Reads the form surface from the chat store and renders it. While the
 * surface hasn't arrived (or has no fields yet) we show a skeleton.
 */
function CheckoutForm({ client }: { client: ChatClient }) {
  const surface = useSurface(client.store, SURFACE_ID);
  const formSpec = useMemo<FormSpec | null>(() => {
    if (!surface) return null;
    if (surface.root.kind !== 'form') return null;
    const props = surface.root.props as { spec?: FormSpec };
    return props.spec ?? null;
  }, [surface]);

  if (!formSpec || formSpec.fields.length === 0) {
    return (
      <View style={styles.formSkeleton}>
        <Text style={styles.skeletonText}>Loading form…</Text>
      </View>
    );
  }

  const handleSubmit = async (payload: FormSubmitPayload) => {
    Alert.alert('submitted', JSON.stringify(payload.values, null, 2));
  };

  return (
    <Form.Root
      key={formSpec.id}
      options={{ spec: formSpec, surfaceId: SURFACE_ID, onSubmit: handleSubmit }}
      style={styles.form}
    >
      <Text style={styles.formTitle}>{formSpec.title}</Text>
      {formSpec.description ? (
        <Text style={styles.formDescription}>{formSpec.description}</Text>
      ) : null}
      {formSpec.fields.map((field) => (
        <FieldRow key={field.name} field={field} />
      ))}
      <Form.Submit>
        {({ submit, busy }) => (
          <Pressable
            onPress={() => {
              void submit();
            }}
            disabled={busy}
            style={({ pressed }) => [
              styles.submitButton,
              busy && styles.submitButtonBusy,
              pressed && styles.submitButtonPressed,
            ]}
          >
            <Text style={styles.submitButtonText}>
              {busy ? 'Submitting…' : (formSpec.submit?.label ?? 'Submit')}
            </Text>
          </Pressable>
        )}
      </Form.Submit>
    </Form.Root>
  );
}

function resolveOptions(field: FieldSpec): ReadonlyArray<FieldOption> {
  const opts = field.options;
  if (!opts) return [];
  if (Array.isArray(opts)) return opts;
  if (typeof opts === 'object' && opts !== null && 'kind' in opts && opts.kind === 'literal') {
    return (opts.value as ReadonlyArray<FieldOption>) ?? [];
  }
  return [];
}

function FieldRow({ field }: { field: FieldSpec }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>
        {field.label ?? field.name}
        {field.constraints?.required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <Form.Field name={field.name}>
        {(state) => <FieldInput field={field} state={state} />}
      </Form.Field>
      <Form.Errors name={field.name}>
        {(errors) => (errors.length > 0 ? <Text style={styles.errorText}>{errors[0]}</Text> : null)}
      </Form.Errors>
    </View>
  );
}

interface FieldInputProps {
  field: FieldSpec;
  state: UseFormFieldResult;
}

/**
 * Maps a `FieldSpec.kind` to a native input bound to the form-engine
 * `state` from `Form.Field`'s render-prop API. We drive `state.setValue`
 * directly rather than relying on the primitive's auto-wiring so the
 * intermediate `FieldInput` wrapper doesn't break prop sniffing.
 */
function FieldInput({ field, state }: FieldInputProps) {
  const stringValue = state.value == null ? '' : String(state.value);

  switch (field.kind) {
    case 'textarea':
      return (
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder={field.placeholder}
          placeholderTextColor="#5f6aa1"
          value={stringValue}
          onChangeText={state.setValue}
          onBlur={state.onBlur}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      );
    case 'email':
      return (
        <TextInput
          style={styles.input}
          placeholder={field.placeholder}
          placeholderTextColor="#5f6aa1"
          value={stringValue}
          onChangeText={state.setValue}
          onBlur={state.onBlur}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      );
    case 'number':
      return (
        <TextInput
          style={styles.input}
          placeholder={field.placeholder}
          placeholderTextColor="#5f6aa1"
          value={stringValue}
          onChangeText={(text) => {
            if (text === '') {
              state.setValue(undefined);
              return;
            }
            const n = Number(text);
            state.setValue(Number.isNaN(n) ? text : n);
          }}
          onBlur={state.onBlur}
          keyboardType="numeric"
        />
      );
    case 'checkbox':
      return (
        <Switch
          value={state.value === true}
          onValueChange={state.setValue}
          onResponderRelease={state.onBlur}
        />
      );
    case 'select':
    case 'radio':
      return <OptionPicker options={resolveOptions(field)} state={state} />;
    default:
      return (
        <TextInput
          style={styles.input}
          placeholder={field.placeholder}
          placeholderTextColor="#5f6aa1"
          value={stringValue}
          onChangeText={state.setValue}
          onBlur={state.onBlur}
        />
      );
  }
}

function OptionPicker({
  options,
  state,
}: {
  options: ReadonlyArray<FieldOption>;
  state: UseFormFieldResult;
}) {
  return (
    <View style={styles.optionRow}>
      {options.map((opt) => {
        const selected = state.value === opt.value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => state.setValue(opt.value)}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#0b1020',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  messagesList: {
    flexGrow: 0,
  },
  bubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '85%',
  },
  bubbleAssistant: {
    backgroundColor: '#1a2240',
    alignSelf: 'flex-start',
  },
  bubbleUser: {
    backgroundColor: '#2b5fff',
    alignSelf: 'flex-end',
  },
  bubbleText: {
    color: '#f5f7ff',
    fontSize: 15,
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#11183a',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  formSkeleton: {
    backgroundColor: '#11183a',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  skeletonText: {
    color: '#5f6aa1',
  },
  formTitle: {
    color: '#f5f7ff',
    fontSize: 18,
    fontWeight: '600',
  },
  formDescription: {
    color: '#a0a8d0',
    fontSize: 13,
    marginBottom: 4,
  },
  fieldRow: {
    gap: 6,
  },
  fieldLabel: {
    color: '#c9cef0',
    fontSize: 13,
    fontWeight: '500',
  },
  required: {
    color: '#ff7a7a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#2a3568',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f5f7ff',
    backgroundColor: '#0b1020',
  },
  textarea: {
    minHeight: 80,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2a3568',
    backgroundColor: '#0b1020',
  },
  optionSelected: {
    borderColor: '#2b5fff',
    backgroundColor: '#1c2a66',
  },
  optionText: {
    color: '#c9cef0',
    fontSize: 13,
  },
  optionTextSelected: {
    color: '#f5f7ff',
    fontWeight: '600',
  },
  errorText: {
    color: '#ff9a9a',
    fontSize: 12,
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2b5fff',
    alignItems: 'center',
  },
  submitButtonBusy: {
    opacity: 0.6,
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitButtonText: {
    color: '#f5f7ff',
    fontSize: 15,
    fontWeight: '600',
  },
  composerContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a2240',
    backgroundColor: '#0b1020',
  },
  composerInput: {
    borderWidth: 1,
    borderColor: '#2a3568',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f5f7ff',
    backgroundColor: '#11183a',
  },
});
