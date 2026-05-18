import { createChatClient } from '@stream-ui/core';
import { Chat } from '@stream-ui/react-native';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

function makeClient() {
  return createChatClient({
    transport: {
      async connect({ onEvent }) {
        // Synthesize two messages so the FlatList has data to key.
        onEvent({
          type: 'TEXT_MESSAGE_START',
          messageId: 'm1',
          role: 'assistant',
        } as never);
        onEvent({
          type: 'TEXT_MESSAGE_CONTENT',
          messageId: 'm1',
          delta: 'hello',
        } as never);
        onEvent({
          type: 'TEXT_MESSAGE_END',
          messageId: 'm1',
        } as never);
        onEvent({
          type: 'TEXT_MESSAGE_START',
          messageId: 'm2',
          role: 'assistant',
        } as never);
        return {
          async send() {
            /* noop */
          },
          async close() {
            /* noop */
          },
        };
      },
    },
  });
}

describe('<Chat.Messages />', () => {
  it('renders one row per message using id as key', async () => {
    const client = makeClient();
    await client.start();

    const tree = render(
      <Chat.Root client={client}>
        <Chat.Messages renderMessage={(m) => <Text testID={`row-${m.id}`}>{m.text}</Text>} />
      </Chat.Root>,
    );

    expect(tree.getByTestId('row-m1')).toBeTruthy();
    expect(tree.getByTestId('row-m2')).toBeTruthy();
    await client.dispose();
  });
});
