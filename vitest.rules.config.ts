import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/reglas.test.ts'], testTimeout: 20000, fileParallelism: false },
});
