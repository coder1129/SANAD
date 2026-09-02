import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    // Keeps the pino transport (a worker thread) out of the test process and
    // silences log output so suite results stay readable.
    env: { NODE_ENV: 'test' },
    coverage: {
      thresholds: {
        statements: 55,
        branches: 40,
        functions: 55,
        lines: 55,
      },
    },
  },
});
