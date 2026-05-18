import type { ChatClient, ChatMessage } from '@stream-ui/core';
import { useMessages, useRunStatus } from '@stream-ui/core/shared-react';
import {
  type ReactElement,
  type ReactNode,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  FlatList,
  type FlatListProps,
  KeyboardAvoidingView,
  type KeyboardAvoidingViewProps,
  type StyleProp,
  TextInput,
  type TextInputProps,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import {
  getKeyboardAvoidingBehavior,
  getKeyboardVerticalOffset,
} from '../keyboard/avoiding-view.js';

interface ChatContextValue {
  client: ChatClient;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('[stream-ui] Chat.* primitives must be rendered inside <Chat.Root>.');
  }
  return ctx;
}

export interface ChatRootProps extends Omit<ViewProps, 'children'> {
  client: ChatClient;
  children: ReactNode;
  /**
   * Wrap descendants in a `KeyboardAvoidingView`. Defaults to true.
   * Disable when the parent screen already provides its own avoidance.
   */
  keyboardAvoiding?: boolean;
  keyboardAvoidingProps?: Omit<KeyboardAvoidingViewProps, 'behavior' | 'children'> & {
    behavior?: KeyboardAvoidingViewProps['behavior'];
  };
}

const fillStyle: ViewStyle = { flex: 1 };

const Root = forwardRef<View, ChatRootProps>(function ChatRoot(
  { client, children, keyboardAvoiding = true, keyboardAvoidingProps, style, ...rest },
  ref,
) {
  const ctxValue = useMemo<ChatContextValue>(() => ({ client }), [client]);
  const content = keyboardAvoiding ? (
    <KeyboardAvoidingView
      behavior={keyboardAvoidingProps?.behavior ?? getKeyboardAvoidingBehavior()}
      keyboardVerticalOffset={
        keyboardAvoidingProps?.keyboardVerticalOffset ?? getKeyboardVerticalOffset()
      }
      style={[fillStyle, keyboardAvoidingProps?.style]}
      {...keyboardAvoidingProps}
    >
      {children}
    </KeyboardAvoidingView>
  ) : (
    children
  );

  return (
    <ChatContext.Provider value={ctxValue}>
      <View ref={ref} style={[fillStyle, style]} {...rest}>
        {content}
      </View>
    </ChatContext.Provider>
  );
});

export interface ChatMessagesProps
  extends Omit<FlatListProps<ChatMessage>, 'data' | 'renderItem' | 'keyExtractor'> {
  renderMessage: (message: ChatMessage) => ReactElement | null;
  /** Override the message id used by FlatList. Defaults to `message.id`. */
  keyExtractor?: (message: ChatMessage) => string;
}

function defaultKeyExtractor(message: ChatMessage): string {
  return message.id;
}

const Messages = forwardRef<FlatList<ChatMessage>, ChatMessagesProps>(function ChatMessages(
  { renderMessage, keyExtractor, ...rest },
  ref,
) {
  const { client } = useChatContext();
  const messages = useMessages(client.store);
  const renderItem = useCallback<NonNullable<FlatListProps<ChatMessage>['renderItem']>>(
    ({ item }) => renderMessage(item),
    [renderMessage],
  );
  return (
    <FlatList<ChatMessage>
      ref={ref}
      data={messages}
      keyExtractor={keyExtractor ?? defaultKeyExtractor}
      renderItem={renderItem}
      {...rest}
    />
  );
});

export interface ChatComposerProps extends Omit<TextInputProps, 'onSubmitEditing'> {
  /**
   * Called on RETURN with the current text. Default behavior is to
   * `client.send({ text })` and clear the input. Hosts can return
   * `false` to skip the default send.
   */
  onSubmit?: (text: string) => undefined | boolean | Promise<undefined | boolean>;
  /**
   * When true (default), disables the input while a run is in flight.
   */
  disableWhileRunning?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

const composerInputStyle: ViewStyle = { flexGrow: 1 };

const Composer = forwardRef<TextInput, ChatComposerProps>(function ChatComposer(
  {
    onSubmit,
    disableWhileRunning = true,
    editable,
    value: controlledValue,
    onChangeText: controlledOnChange,
    containerStyle,
    style,
    ...rest
  },
  ref,
) {
  const { client } = useChatContext();
  const status = useRunStatus(client.store);
  const [internalValue, setInternalValue] = useState('');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const handleChangeText = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      controlledOnChange?.(next);
    },
    [isControlled, controlledOnChange],
  );

  const handleSubmit = useCallback(async () => {
    const text = (value ?? '').trim();
    if (!text) return;
    const result = await onSubmit?.(text);
    if (result === false) return;
    if (!onSubmit) {
      await client.send({ text });
    }
    if (!isControlled) setInternalValue('');
  }, [client, isControlled, onSubmit, value]);

  const disabled = editable === false || (disableWhileRunning && status === 'running');

  return (
    <View style={containerStyle}>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={handleChangeText}
        onSubmitEditing={handleSubmit}
        editable={!disabled}
        blurOnSubmit={false}
        returnKeyType="send"
        style={[composerInputStyle, style]}
        {...rest}
      />
    </View>
  );
});

export const Chat: {
  Root: typeof Root;
  Messages: typeof Messages;
  Composer: typeof Composer;
} = {
  Root,
  Messages,
  Composer,
};

// Named exports for `import { ChatRoot } from '@stream-ui/react-native'`.
export { Root as ChatRoot, Messages as ChatMessages, Composer as ChatComposer };
