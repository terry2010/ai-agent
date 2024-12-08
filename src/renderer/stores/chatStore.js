import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useModelStore } from './modelStore'

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

          // 发送消息给模型
          await window.api.sendMessage(content, modelStore.currentModel)
        } catch (err) {
          this.error = err.message
          throw err
        } finally {
          this.isLoading = false
        }
      }

      return message
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
    'reset'
  ]
  console.log('Store defined with actions:', storeActions)
}
