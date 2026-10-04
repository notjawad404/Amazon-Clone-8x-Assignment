import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.js'],
    setupFiles: ['src/tests/setup.js'],
    hookTimeout: 60_000,
    testTimeout: 15_000,
  },
})
