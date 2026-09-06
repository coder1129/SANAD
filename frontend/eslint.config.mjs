import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
  ]),
  // HTTP transport stays behind lib/api. Everything else consumes domain API
  // modules, so endpoint paths and Axios details never reach components.
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['lib/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'axios',
              message:
                'Import from @/lib/api instead — Axios stays inside the API core.',
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
