import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.ts',
    css: true,
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
