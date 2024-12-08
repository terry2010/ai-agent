import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '../chatStore'

describe('chatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 清除 localStorage
    localStorage.clear()
    // 模拟 window.api
    vi.stubGlobal('window', {
      api: {
        sendMessage: vi.fn()
      }
    })
  })

  it('should initialize with default values', () => {
    const store = useChatStore()
    expect(store.conversations).toEqual([])
    expect(store.currentConversationId).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('should create new conversation', () => {
    const store = useChatStore()
    const conversation = store.createConversation()
    
    expect(conversation).toBeDefined()
    expect(conversation.id).toBeDefined()
    expect(conversation.messages).toEqual([])
    expect(store.currentConversationId).toBe(conversation.id)
  })

  it('should select conversation', () => {
    const store = useChatStore()
    const conv1 = store.createConversation()
    const conv2 = store.createConversation()
    
    store.selectConversation(conv1.id)
    expect(store.currentConversationId).toBe(conv1.id)
  })

  it('should update conversation title', () => {
    const store = useChatStore()
    const conversation = store.createConversation()
    const newTitle = '新标题'
    
    store.updateConversationTitle(conversation.id, newTitle)
    expect(store.currentConversation.title).toBe(newTitle)
  })

  it('should delete conversation', () => {
    const store = useChatStore()
    const conv1 = store.createConversation()
    const conv2 = store.createConversation()
    
    store.deleteConversation(conv1.id)
    expect(store.conversations.length).toBe(1)
    expect(store.currentConversationId).toBe(conv2.id)
  })

  it('should add user message and get AI response', async () => {
    const store = useChatStore()
    const aiResponse = { content: 'AI回复' }
    window.api.sendMessage.mockResolvedValue(aiResponse)
    
    store.createConversation()
    await store.addMessage('用户消息', 'user')
    
    expect(store.currentMessages.length).toBe(2)
    expect(store.currentMessages[0].role).toBe('user')
    expect(store.currentMessages[1].role).toBe('assistant')
    expect(store.currentMessages[1].content).toBe(aiResponse.content)
  })

  it('should handle message error', async () => {
    const store = useChatStore()
    window.api.sendMessage.mockRejectedValue(new Error('发送失败'))
    
    store.createConversation()
    await store.addMessage('用户消息', 'user')
    
    expect(store.error).toBe('发送失败')
    expect(store.currentMessages.length).toBe(1)
  })

  it('should save and load from localStorage', () => {
    const store = useChatStore()
    const conversation = store.createConversation()
    store.addMessage('测试消息', 'user')
    
    store.saveToLocalStorage()
    store.conversations = []
    store.loadFromLocalStorage()
    
    expect(store.conversations.length).toBe(1)
    expect(store.conversations[0].id).toBe(conversation.id)
  })

  it('should handle empty localStorage', () => {
    const store = useChatStore()
    store.loadFromLocalStorage()
    
    expect(store.conversations).toEqual([])
    expect(store.currentConversationId).toBeNull()
  })
})
