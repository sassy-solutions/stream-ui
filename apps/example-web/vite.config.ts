/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { agUiMockPlugin } from './src/server-mock.js';

export default defineConfig({
  plugins: [react(), agUiMockPlugin()],
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: false,
  },
});
