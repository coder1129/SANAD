import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'components/auth/auth-modal.tsx',
        'components/pages/cms-rich-text.tsx',
        'lib/api/modules/auth.ts',
        'lib/auth/redirect.ts',
        'lib/auth/session-hint.ts',
        'lib/env/public-env-schema.ts',
      ],
    },
  },
});
