import { vi } from 'vitest'
import { config } from '@vue/test-utils'
import ElementPlus from 'element-plus'

// Mock window properties and methods
class MockEvent {
  constructor(type, options = {}) {
    this.type = type
    this.bubbles = options.bubbles || false
    this.cancelable = options.cancelable || false
    this.composed = options.composed || false
    this.target = options.target || null
    this.currentTarget = options.currentTarget || null
    this.defaultPrevented = false
    this.eventPhase = 0
    this.timeStamp = Date.now()
    this.isTrusted = false
  }

  preventDefault() {
    this.defaultPrevented = true
  }

  stopPropagation() {}

  stopImmediatePropagation() {}

  composedPath() {
    return [this.target, this.currentTarget]
  }
}

class MockInputEvent extends MockEvent {
  constructor(type, options = {}) {
    super(type, options)
    this.data = options.data || null
    this.inputType = options.inputType || 'insertText'
    this.isComposing = options.isComposing || false
  }
}

class MockKeyboardEvent extends MockEvent {
  constructor(type, options = {}) {
    super(type, options)
    this.key = options.key || ''
    this.code = options.code || ''
    this.location = options.location || 0
    this.ctrlKey = options.ctrlKey || false
    this.shiftKey = options.shiftKey || false
    this.altKey = options.altKey || false
    this.metaKey = options.metaKey || false
    this.repeat = options.repeat || false
    this.isComposing = options.isComposing || false
  }
}

class MockMouseEvent extends MockEvent {
  constructor(type, options = {}) {
    super(type, options)
    this.screenX = options.screenX || 0
    this.screenY = options.screenY || 0
    this.clientX = options.clientX || 0
    this.clientY = options.clientY || 0
    this.ctrlKey = options.ctrlKey || false
    this.shiftKey = options.shiftKey || false
    this.altKey = options.altKey || false
    this.metaKey = options.metaKey || false
    this.button = options.button || 0
    this.buttons = options.buttons || 0
    this.relatedTarget = options.relatedTarget || null
  }
}

// Mock window event constructors
global.Event = MockEvent
global.InputEvent = MockInputEvent
global.KeyboardEvent = MockKeyboardEvent
global.MouseEvent = MockMouseEvent

// Mock window methods
global.window = {
  ...global.window,
  Event: MockEvent,
  InputEvent: MockInputEvent,
  KeyboardEvent: MockKeyboardEvent,
  MouseEvent: MockMouseEvent,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  getComputedStyle: () => ({
    getPropertyValue: () => ''
  }),
  scrollTo: vi.fn(),
  requestAnimationFrame: vi.fn(),
  api: {
    sendMessage: vi.fn(),
    checkConnection: vi.fn(),
    checkModel: vi.fn()
  },
  matchMedia: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
}

// Mock Element methods and properties
Element.prototype.scrollTo = vi.fn()
Element.prototype.scrollIntoView = vi.fn()
Object.defineProperty(Element.prototype, 'scrollHeight', {
  get: function() { return 1000 }
})
Object.defineProperty(Element.prototype, 'scrollTop', {
  get: function() { return 0 },
  set: function() {}
})
Object.defineProperty(Element.prototype, 'clientHeight', {
  get: function() { return 800 }
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  disconnect() {}
  takeRecords() { return [] }
}

// Mock external CSS imports
vi.mock('md-editor-v3/lib/preview.css', () => ({}))
vi.mock('@highlightjs/cdn-assets/styles/atom-one-dark.min.css', () => ({}))
vi.mock('katex/dist/katex.min.css', () => ({}))

// Mock fetch for external resources
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve('/* mocked css */')
  })
)

// Mock MdPreview component
vi.mock('md-editor-v3', () => ({
  MdPreview: {
    name: 'MdPreview',
    props: ['modelValue'],
    template: '<div class="md-preview">{{ modelValue }}</div>'
  }
}))

// Configure Vue Test Utils
config.global.plugins = [ElementPlus]
