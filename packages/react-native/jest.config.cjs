/**
 * We use the `react-native` preset (shipped by RN itself) rather than
 * the heavier `jest-expo` preset. The package is Expo-Go compatible at
 * runtime; tests just need RN's babel transform + module map.
 *
 * `jest-expo` is still listed as a devDep so downstream apps can swap
 * it in if they want the Expo-flavored matchers.
 */
const path = require('node:path');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!.*(?:react-native|@react-native|@react-native-community|expo|@expo|react-clone-referenced-element|@react-navigation)).*',
  ],
  moduleNameMapper: {
    // Strip the `.js` extension TS sources use for NodeNext ESM imports.
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@stream-ui/core/shared-react$': path.resolve(__dirname, '../core/src/shared-react/index.ts'),
    '^@stream-ui/core$': path.resolve(__dirname, '../core/src/index.ts'),
    '^@stream-ui/protocol$': path.resolve(__dirname, '../protocol/src/index.ts'),
    '^@stream-ui/react-native$': path.resolve(__dirname, 'src/index.ts'),
  },
};
