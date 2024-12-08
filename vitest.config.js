const { defineConfig } = require('vitest/config')
const vue = require('@vitejs/plugin-vue')
const path = require('path')

module.exports = defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.js'],
    environmentOptions: {
      happyDOM: {
        supported: { 
          requestAnimationFrame: true,
          Promise: true,
          Event: true,
          CustomEvent: true,
          InputEvent: true,
          fetch: true
        },
        settings: {
          disableJavaScriptEvaluation: false,
          disableJavaScriptFileLoading: false,
          disableCSSFileLoading: true,
          enableFileSystemHttpRequests: false
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
