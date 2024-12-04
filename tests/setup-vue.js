import { config } from '@vue/test-utils'
import ElementPlus from 'element-plus'

// Mock window.electron
global.electron = {
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  }
}

// Configure Vue Test Utils
config.global.plugins = [ElementPlus]

// Mock CSS imports
vi.mock('element-plus/dist/index.css', () => ({}))
vi.mock('element-plus/theme-chalk/dark/css-vars.css', () => ({}))

// Mock markdown editor
vi.mock('md-editor-v3', () => {
  return {
    MdEditor: {
      name: 'MdEditor',
      render: () => null
    },
    MdPreview: {
      name: 'MdPreview',
      props: ['modelValue'],
      template: '<div>{{ modelValue }}</div>'
    }
  }
})
