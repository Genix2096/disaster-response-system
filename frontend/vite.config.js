import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // amazon-cognito-identity-js (via its `buffer` dependency) expects Node's `global`.
  define: {
    global: 'globalThis',
  },
});
