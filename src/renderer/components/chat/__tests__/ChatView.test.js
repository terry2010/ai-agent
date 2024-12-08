import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import ChatView from '../ChatView.vue'
import { useChatStore } from '../../../stores/chatStore'
import { useModelStore } from '../../../stores/modelStore'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock

// Mock external dependencies
vi.mock('markdown-it', () => ({
  default: vi.fn().mockImplementation(() => ({
    render: vi.fn().mockReturnValue('rendered markdown')
  }))
}))

vi.mock('highlight.js', () => ({
  default: {
    getLanguage: vi.fn(),
    highlight: vi.fn()
  }
}))

// Mock window.api
global.window.api = {
  sendMessage: vi.fn().mockResolvedValue({ content: '模型回复' }),
  checkConnection: vi.fn().mockResolvedValue({ connected: true }),
  checkModel: vi.fn().mockResolvedValue({ status: 'ready' })
}

describe('ChatView', () => {
  let wrapper
  let chatStore
  let modelStore

  // Mock Element Plus components
  const stubs = {
    'el-scrollbar': {
      template: '<div class="el-scrollbar"><div class="el-scrollbar__wrap"><slot /></div></div>'
    },
    'el-input': {
      template: '<div class="el-input"><textarea v-model="modelValue" @keydown="$emit(\'keydown\', $event)" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea></div>',
      props: ['modelValue'],
      emits: ['update:modelValue', 'keydown']
    },
    'el-button': {
      template: '<button class="el-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
      props: ['disabled'],
      emits: ['click']
    },
    'el-alert': {
      template: '<div class="el-alert" role="alert"><slot /></div>',
      props: ['title', 'type']
    }
  }

  beforeEach(async () => {
    // Reset localStorage mock
    localStorageMock.getItem.mockReset()
    localStorageMock.setItem.mockReset()
    
    // Setup Pinia store
    setActivePinia(createPinia())
    chatStore = useChatStore()
    modelStore = useModelStore()
    
    // Create initial conversation
    chatStore.createConversation()
    modelStore.setStatus('connected')
    
    // Mount component
    wrapper = mount(ChatView, {
      global: {
        stubs,
        plugins: [createPinia()]
      },
      attachTo: document.createElement('div')
    })

    // Wait for component to be mounted
    await nextTick()
  })

  afterEach(() => {
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('should mount properly', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('should render messages', async () => {
    const message = { role: 'user', content: '测试消息', id: 1, timestamp: Date.now() }
    chatStore.addMessage(message)
    await nextTick()
    await nextTick() // Wait for markdown rendering
    
    const messages = wrapper.findAll('.message')
    expect(messages.length).toBe(1)
    expect(messages[0].text()).toContain('测试消息')
  })

  it('should handle message input', async () => {
    const input = wrapper.find('.el-input textarea')
    expect(input.exists()).toBe(true)
    
    await input.setValue('测试消息')
    await nextTick()
    
    expect(input.element.value).toBe('测试消息')
  })

  it('should send message', async () => {
    const input = wrapper.find('.el-input textarea')
    const sendButton = wrapper.find('.el-button')
    expect(input.exists()).toBe(true)
    expect(sendButton.exists()).toBe(true)
    
    await input.setValue('测试消息')
    await nextTick()
    await sendButton.trigger('click')
    await nextTick()
    
    expect(chatStore.currentMessages.length).toBe(2) // 用户消息和模型回复
    expect(chatStore.currentMessages[0].content).toBe('测试消息')
  })

  it('should handle streaming response', async () => {
    window.api.sendMessage.mockImplementationOnce(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ content: '模型回复', streaming: true })
        }, 100)
      })
    })

    const input = wrapper.find('.el-input textarea')
    const sendButton = wrapper.find('.el-button')
    
    await input.setValue('测试消息')
    await nextTick()
    await sendButton.trigger('click')
    await new Promise(resolve => setTimeout(resolve, 200))
    
    expect(chatStore.isLoading).toBe(false)
    expect(chatStore.currentMessages.length).toBe(2)
    expect(chatStore.currentMessages[1].content).toBe('模型回复')
  })

  it('should handle network errors', async () => {
    window.api.sendMessage.mockRejectedValueOnce(new Error('网络错误'))

    const input = wrapper.find('.el-input textarea')
    const sendButton = wrapper.find('.el-button')
    
    await input.setValue('测试消息')
    await nextTick()
    await sendButton.trigger('click')
    await nextTick()
    
    expect(chatStore.error).toBe('网络错误')
    expect(chatStore.isLoading).toBe(false)
  })

  it('should handle model response error', async () => {
    window.api.sendMessage.mockResolvedValueOnce({ error: '模型错误' })

    const input = wrapper.find('.el-input textarea')
    const sendButton = wrapper.find('.el-button')
    
    await input.setValue('测试消息')
    await nextTick()
    await sendButton.trigger('click')
    await nextTick()
    
    expect(chatStore.error).toBe('模型错误')
    expect(chatStore.isLoading).toBe(false)
  })

  it('should handle message export', async () => {
    chatStore.addMessage({ role: 'user', content: '用户消息', id: 1, timestamp: Date.now() })
    chatStore.addMessage({ role: 'assistant', content: '助手回复', id: 2, timestamp: Date.now() })
    await nextTick()
    
    const exportButton = wrapper.find('.export-button')
    expect(exportButton.exists()).toBe(true)
    
    await exportButton.trigger('click')
    await nextTick()
    
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('should not send empty messages', async () => {
    const sendButton = wrapper.find('.el-button')
    expect(sendButton.attributes('disabled')).toBeDefined()
    
    await sendButton.trigger('click')
    await nextTick()
    
    expect(chatStore.currentMessages.length).toBe(0)
  })

  it('should handle long messages', async () => {
    const longMessage = 'a'.repeat(1000)
    const input = wrapper.find('.el-input textarea')
    const sendButton = wrapper.find('.el-button')
    
    await input.setValue(longMessage)
    await nextTick()
    await sendButton.trigger('click')
    await nextTick()
    
    expect(chatStore.currentMessages[0].content).toBe(longMessage)
  })

  it('should handle consecutive messages', async () => {
    const input = wrapper.find('.el-input textarea')
    const sendButton = wrapper.find('.el-button')
    
    // 发送第一条消息
    await input.setValue('消息1')
    await nextTick()
    await sendButton.trigger('click')
    await nextTick()
    
    // 发送第二条消息
    await input.setValue('消息2')
    await nextTick()
    await sendButton.trigger('click')
    await nextTick()
    
    expect(chatStore.currentMessages.length).toBe(4) // 两条用户消息和两条模型回复
  })

  it('should handle model switching during conversation', async () => {
    const input = wrapper.find('.el-input textarea')
    const sendButton = wrapper.find('.el-button')
    
    // 发送消息
    await input.setValue('测试消息')
    await nextTick()
    await sendButton.trigger('click')
    await nextTick()
    
    // 切换模型
    modelStore.setCurrentModel('gpt-4')
    await nextTick()
    
    // 再次发送消息
    await input.setValue('新消息')
    await nextTick()
    await sendButton.trigger('click')
    await nextTick()
    
    expect(chatStore.currentMessages.length).toBe(4)
  })
})
