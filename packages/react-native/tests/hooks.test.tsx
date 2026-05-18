/**
 * Smoke test that the RN package re-exports every hook from
 * `@stream-ui/core/shared-react` — so the "Tamagui-style" shared
 * surface stays in sync.
 */
import * as rn from '@stream-ui/react-native';

describe('@stream-ui/react-native hook re-exports', () => {
  it('exposes every chat hook from shared-react', () => {
    expect(typeof rn.useChatClient).toBe('function');
    expect(typeof rn.useChatState).toBe('function');
    expect(typeof rn.useMessages).toBe('function');
    expect(typeof rn.useToolCalls).toBe('function');
    expect(typeof rn.useSurface).toBe('function');
    expect(typeof rn.useAgentState).toBe('function');
    expect(typeof rn.useRunStatus).toBe('function');
  });

  it('exposes every form hook from shared-react', () => {
    expect(typeof rn.useForm).toBe('function');
    expect(typeof rn.useFormField).toBe('function');
  });

  it('exposes the platform-aware keyboard helpers', () => {
    expect(typeof rn.getKeyboardAvoidingBehavior).toBe('function');
    expect(typeof rn.getKeyboardVerticalOffset).toBe('function');
    // Behavior is one of: 'padding', 'height', or undefined.
    const behavior = rn.getKeyboardAvoidingBehavior();
    expect(['padding', 'height', undefined]).toContain(behavior);
  });
});
