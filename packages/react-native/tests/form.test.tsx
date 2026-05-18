import type { FormSpec } from '@stream-ui/protocol';
import { Form } from '@stream-ui/react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { TextInput } from 'react-native';

const spec: FormSpec = {
  id: 'demo',
  fields: [
    { name: 'first', kind: 'string', label: 'First', constraints: { required: true } },
    { name: 'age', kind: 'number', label: 'Age' },
  ],
};

describe('<Form.Field />', () => {
  it('wires a TextInput child to the engine via onChangeText', () => {
    const tree = render(
      <Form.Root options={{ spec }}>
        <Form.Field name="first">
          <TextInput testID="first-input" />
        </Form.Field>
      </Form.Root>,
    );

    const input = tree.getByTestId('first-input');
    fireEvent.changeText(input, 'Ada');
    expect(input.props.value).toBe('Ada');
  });

  it('coerces numeric fields when the spec says number', () => {
    const captured: unknown[] = [];

    const tree = render(
      <Form.Root options={{ spec }}>
        <Form.Field name="age">
          {(field) => {
            captured.push(field.value);
            return (
              <TextInput
                testID="age-input"
                onChangeText={(t) => field.setValue(t === '' ? undefined : Number(t))}
                value={field.value == null ? '' : String(field.value)}
              />
            );
          }}
        </Form.Field>
      </Form.Root>,
    );

    fireEvent.changeText(tree.getByTestId('age-input'), '42');
    expect(captured.at(-1)).toBe(42);
  });
});
