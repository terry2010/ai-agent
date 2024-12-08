import { config } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest'

// Mock window.electron and window.api
global.electron = {
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  }
}

global.window = {
  ...global.window,
  api: {
    sendMessage: vi.fn(),
    checkConnection: vi.fn(),
    checkModel: vi.fn()
  }
}

// Configure Vue Test Utils
config.global.plugins = [ElementPlus]

// Mock CSS imports
vi.mock('element-plus/dist/index.css', () => ({}))
vi.mock('element-plus/theme-chalk/dark/css-vars.css', () => ({}))
vi.mock('@/assets/styles/main.scss', () => ({}))

// Mock markdown editor
vi.mock('md-editor-v3', () => ({
  MdEditor: {
    name: 'MdEditor',
    props: ['modelValue'],
    template: '<div>{{ modelValue }}</div>',
    render() {
      return h('div', this.modelValue)
    }
  },
  MdPreview: {
    name: 'MdPreview',
    props: ['modelValue'],
    template: '<div>{{ modelValue }}</div>'
  }
}))
