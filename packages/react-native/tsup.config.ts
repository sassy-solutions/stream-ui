import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
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
    'react',
    'react-native',
    '@stream-ui/core',
    '@stream-ui/core/shared-react',
    '@stream-ui/protocol',
  ],
});
