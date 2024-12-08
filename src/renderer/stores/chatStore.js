import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useModelStore } from './modelStore'

// 添加日志工具
const DEBUG = process.env.NODE_ENV === 'development'
const log = {
  info: (...args) => DEBUG && console.log('[Chat]', ...args),
  error: (...args) => console.error('[Chat Error]', ...args),
  response: (...args) => console.log('[AI Response]', ...args)
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: [],
    currentConversationId: null,
    isLoading: false,
    error: null
  }),

  getters: {
    currentConversation: (state) => 
      state.conversations.find(conv => conv.id === state.currentConversationId),
    
    currentMessages: (state) => {
      const conversation = state.conversations.find(conv => conv.id === state.currentConversationId)
      return conversation?.messages || []
    }
  },

  actions: {
    createConversation() {
      const newConversation = {
        id: Date.now(),
        title: `新对话 ${this.conversations.length + 1}`,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      this.conversations.push(newConversation)
      this.currentConversationId = newConversation.id
      this.saveToLocalStorage()
      
      return newConversation
    },

    async addMessage(content, role = 'user') {
      if (!this.currentConversation) {
        this.createConversation()
      }

      const message = {
        id: Date.now(),
        content,
        role,
        timestamp: new Date().toISOString()
      }

      log.info(`Adding ${role} message:`, content.substring(0, 100) + '...')

      const conversation = this.conversations.find(conv => conv.id === this.currentConversationId)
      if (!conversation) {
        throw new Error('当前会话不存在')
      }

      conversation.messages.push(message)
      conversation.updatedAt = new Date().toISOString()
      this.saveToLocalStorage()

      if (role === 'user') {
        this.isLoading = true
        this.error = null

        try {
          // 从 modelStore 获取当前选择的模型
          const modelStore = useModelStore()
          if (!modelStore.currentModel) {
            throw new Error('请先选择一个模型')
          }
        } catch (err) {
          log.error('Failed to get model response:', err)
          this.error = err.message
          throw err
        } finally {
          this.isLoading = false
        }
      }

      return message
    },

    // 更新消息内容
    updateMessageContent(messageId, chunk) {
      const conversation = this.conversations.find(conv => conv.id === this.currentConversationId)
      if (!conversation) return

      const message = conversation.messages.find(m => m.id === messageId)
      if (message) {
        // 使用新的消息对象来触发响应式更新
        const index = conversation.messages.indexOf(message)
        conversation.messages[index] = {
          ...message,
          content: (message.content || '') + chunk
        }
        this.saveToLocalStorage()
      }
    },

    async checkModelStatus() {
      try {
        const status = await window.api.checkConnection()
        return status.connected
      } catch (error) {
        console.error('Failed to check model status:', error)
        return false
      }
    },

    loadFromLocalStorage() {
      try {
        const data = localStorage.getItem('chat-store')
        if (data) {
          const parsed = JSON.parse(data)
          this.conversations = parsed.conversations || []
          this.currentConversationId = parsed.currentConversationId
        }
      } catch (error) {
        console.error('Failed to load from localStorage:', error)
      }
    },

    saveToLocalStorage() {
      try {
        const data = {
          conversations: this.conversations,
          currentConversationId: this.currentConversationId
        }
        localStorage.setItem('chat-store', JSON.stringify(data))
      } catch (error) {
        console.error('Failed to save to localStorage:', error)
      }
    },

    reset() {
      this.conversations = []
      this.currentConversationId = null
      this.isLoading = false
      this.error = null
      localStorage.removeItem('chat-store')
    },

    // 删除会话
    deleteConversation(conversationId) {
      const index = this.conversations.findIndex(conv => conv.id === conversationId)
      if (index !== -1) {
        this.conversations.splice(index, 1)
        
        // 如果删除的是当前会话，切换到其他会话
        if (this.currentConversationId === conversationId) {
          this.currentConversationId = this.conversations.length > 0 
            ? this.conversations[0].id 
            : null
        }
        
        this.saveToLocalStorage()
        return true
      }
      return false
    },

    // 选择会话
    selectConversation(conversationId) {
      const conversation = this.conversations.find(conv => conv.id === conversationId)
      if (conversation) {
        this.currentConversationId = conversationId
        this.error = null
        this.saveToLocalStorage()
        return true
      }
      return false
    }
  }
})

// 打印 store 定义
if (process.env.NODE_ENV === 'development') {
  const storeActions = [
    'createConversation',
    'addMessage',
    'checkModelStatus',
    'loadFromLocalStorage',
    'saveToLocalStorage',
    'reset',
    'deleteConversation',
    'selectConversation',
    'updateMessageContent'
  ]
  console.log('Store defined with actions:', storeActions)
}
