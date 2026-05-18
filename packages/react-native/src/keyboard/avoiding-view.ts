import { Platform } from 'react-native';

/**
 * The behavior `KeyboardAvoidingView` should use on the current platform.
 *
 * - iOS prefers `padding` because the keyboard slides over the content.
 * - Android relies on its windowSoftInputMode but RN's `height` mode
 *   gives the most predictable result inside a scroll surface.
 *
 * Other platforms (web, macOS-as-RN, etc.) skip the avoiding view by
 * returning `undefined` — callers should treat that as "no avoidance".
 */
export type KeyboardAvoidingBehavior = 'padding' | 'height' | 'position';

export function getKeyboardAvoidingBehavior(): KeyboardAvoidingBehavior | undefined {
  if (Platform.OS === 'ios') return 'padding';
  if (Platform.OS === 'android') return 'height';
  return undefined;
}

/**
 * iOS sometimes needs a small vertical offset so the composer clears
 * the home indicator / safe-area inset. Hosts can override via prop;
 * this is just a sensible default.
 */
export function getKeyboardVerticalOffset(): number {
  return Platform.OS === 'ios' ? 0 : 0;
}
