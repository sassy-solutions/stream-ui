/**
 * Lint config for `@stream-ui/react-native`.
 *
 * The critical rule is `no-restricted-globals` blocking DOM identifiers
 * (`window`, `document`, etc.). React Native does not polyfill these,
 * so any reference will crash at runtime on a device. The plugin
 * `eslint-plugin-react-native` adds platform-aware checks on top.
 */
module.exports = {
  root: true,
  env: { 'react-native/react-native': true, es2022: true, node: false },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['react-native'],
  rules: {
    // DOM globals are forbidden — RN has no DOM.
    'no-restricted-globals': [
      'error',
      { name: 'window', message: 'No DOM in React Native — use Platform / Dimensions.' },
      { name: 'document', message: 'No DOM in React Native — use the platform APIs.' },
      { name: 'navigator', message: 'No DOM in React Native — use Platform.OS instead.' },
      { name: 'localStorage', message: 'Use @react-native-async-storage/async-storage.' },
      { name: 'sessionStorage', message: 'Use @react-native-async-storage/async-storage.' },
    ],
    // Soft RN rules — we use inline styles for primitives + want to keep raw <Text> behind APIs.
    'react-native/no-raw-text': 'off',
    'react-native/no-inline-styles': 'off',
    'react-native/no-color-literals': 'off',
    'react-native/no-unused-styles': 'warn',
    'react-native/split-platform-components': 'warn',
  },
  overrides: [
    {
      files: ['tests/**/*'],
      env: { jest: true, node: true },
      rules: {
        'no-restricted-globals': 'off',
      },
    },
  ],
};
