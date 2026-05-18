import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/react.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
  external: [
    'vitest',
    '@testing-library/react',
    '@stream-ui/core',
    '@stream-ui/protocol',
    '@stream-ui/react',
    'react',
    'react-dom',
  ],
});
