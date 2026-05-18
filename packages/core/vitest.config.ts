import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/adapters/zod.ts'],
      thresholds: {
        'src/parser/**': { lines: 80, functions: 80, branches: 75, statements: 80 },
        'src/form/**': { lines: 80, functions: 80, branches: 75, statements: 80 },
      },
    },
  },
});
