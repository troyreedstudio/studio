import { defineConfig } from 'vitest/config';

// Wave-0 test harness for LMC.
// - Pure-logic / unit tests run in the node environment.
// - Integration tests that need a live Supabase use the helper in ./test/setup.ts
//   (skipped automatically when EXPO_PUBLIC_SUPABASE_URL is not set).
// SQL/RLS security tests live in supabase/tests/ and run via `supabase test db`.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/ios/**', '**/android/**', '**/.expo/**'],
    // Wave-0 harness should exit 0 before any suites are written; later plans add tests.
    passWithNoTests: true,
  },
});
