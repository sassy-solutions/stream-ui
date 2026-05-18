import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/index.ts', 'src/react.ts', 'src/helpers/**'],
      thresholds: {
        'src/mock-transport.ts': { lines: 80, functions: 80, branches: 70, statements: 80 },
      },
    },
  },
});
