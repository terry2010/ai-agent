import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import MainLayout from '../MainLayout.vue'
import { useModelStore } from '../../../stores/modelStore'
import { useChatStore } from '../../../stores/chatStore'

// Mock window.api
vi.mock('@/preload/api', () => ({
  default: {
    sendMessage: vi.fn(),
    checkConnection: vi.fn(),
    checkModel: vi.fn()
  }
}))

describe('MainLayout', () => {
  let wrapper
  let chatStore
  let modelStore

  // Mock Element Plus components
  const stubs = {
    'el-container': {
      template: '<div class="el-container"><slot /></div>'
    },
    'el-aside': {
      template: '<div class="el-aside"><slot /></div>'
    },
    'el-main': {
      template: '<div class="el-main"><slot /></div>'
    },
    'el-tag': {
      template: '<div class="el-tag" :class="[\'el-tag--\' + type]">{{ text }}</div>',
      props: ['type', 'text']
    },
    'el-button': {
      template: '<button class="el-button" @click="$emit(\'click\')"><slot /></button>',
      emits: ['click']
    },
    'el-select': {
      template: '<select class="el-select" v-model="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
      props: ['modelValue'],
      emits: ['update:modelValue']
    },
    'el-option': {
      template: '<option :value="value">{{ label }}</option>',
      props: ['value', 'label']
    }
  }

  beforeEach(async () => {
    setActivePinia(createPinia())
    chatStore = useChatStore()
    modelStore = useModelStore()
    
    // 设置初始状态
    chatStore.createConversation()
    modelStore.setCurrentModel('test-model')
    
    wrapper = mount(MainLayout, {
      global: {
        stubs,
        plugins: [createPinia()]
      },
      attachTo: document.createElement('div')
    })
    
    await nextTick()
  })

  afterEach(() => {
    wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('should mount properly', () => {
    expect(wrapper.exists()).toBe(true)
  })

  describe('model status tests', () => {
    it('should show connected status', async () => {
      modelStore.setStatus('connected')
      await nextTick()

      const tag = wrapper.find('.el-tag')
      expect(tag.exists()).toBe(true)
      expect(tag.text()).toBe('模型已连接')
      expect(tag.classes()).toContain('el-tag--success')
    })

    it('should show disconnected status', async () => {
      modelStore.setStatus('disconnected')
      await nextTick()

      const tag = wrapper.find('.el-tag')
      expect(tag.exists()).toBe(true)
      expect(tag.text()).toBe('模型未连接')
      expect(tag.classes()).toContain('el-tag--info')
    })

    it('should show connecting status', async () => {
      modelStore.setStatus('connecting')
      await nextTick()

      const tag = wrapper.find('.el-tag')
      expect(tag.exists()).toBe(true)
      expect(tag.text()).toBe('正在连接')
      expect(tag.classes()).toContain('el-tag--warning')
    })

    it('should handle connection error', async () => {
      modelStore.setError('连接错误')
      await nextTick()

      const tag = wrapper.find('.el-tag')
      expect(tag.exists()).toBe(true)
      expect(tag.text()).toBe('连接错误')
      expect(tag.classes()).toContain('el-tag--danger')
    })

    it('should auto-retry connection on error', async () => {
      const retryConnection = vi.spyOn(modelStore, 'retryConnection')
      modelStore.setError('连接错误')
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(retryConnection).toHaveBeenCalled()
    })
  })

  it('should handle model change', async () => {
    const select = wrapper.find('.el-select')
    expect(select.exists()).toBe(true)
    
    await select.setValue('gpt-4')
    await nextTick()
    
    expect(modelStore.currentModel).toBe('gpt-4')
  })

  it('should create new chat', async () => {
    const initialCount = chatStore.conversations.length
    const createButton = wrapper.find('.history-header .el-button')
    expect(createButton.exists()).toBe(true)
    
    await createButton.trigger('click')
    await nextTick()
    
    expect(chatStore.conversations.length).toBe(initialCount + 1)
  })

  it('should delete chat', async () => {
    // 先创建一个额外的对话
    chatStore.createConversation()
    await nextTick()
    
    const initialCount = chatStore.conversations.length
    const deleteButton = wrapper.find('.history-list .el-button')
    expect(deleteButton.exists()).toBe(true)
    
    await deleteButton.trigger('click')
    await nextTick()
    
    expect(chatStore.conversations.length).toBe(initialCount - 1)
  })

  it('should switch chat', async () => {
    // 创建第二个对话
    const chat2 = chatStore.createConversation()
    await nextTick()
    
    const chatItem = wrapper.find(`.history-item[data-id="${chat2.id}"]`)
    expect(chatItem.exists()).toBe(true)
    
    await chatItem.trigger('click')
    await nextTick()
    
    expect(chatStore.currentChat.id).toBe(chat2.id)
  })
})
