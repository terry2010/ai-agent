import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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

    createNewConversation() {
      return this.createConversation()
    },

    selectConversation(id) {
      const conversation = this.conversations.find(conv => conv.id === id)
      if (conversation) {
        this.currentConversationId = id
        this.saveToLocalStorage()
      }
    },

    updateConversationTitle(id, title) {
      const conversation = this.conversations.find(conv => conv.id === id)
      if (conversation) {
        conversation.title = title
        conversation.updatedAt = new Date().toISOString()
        this.saveToLocalStorage()
      }
    },

    deleteConversation(id) {
      const index = this.conversations.findIndex(conv => conv.id === id)
      if (index !== -1) {
        this.conversations.splice(index, 1)
        if (this.currentConversationId === id) {
          this.currentConversationId = this.conversations[0]?.id || null
        }
        this.saveToLocalStorage()
      }
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
      if (conversation) {
        conversation.messages.push(message)
        conversation.updatedAt = new Date().toISOString()
        this.saveToLocalStorage()
      }

      if (role === 'user') {
        try {
          this.isLoading = true
          this.error = null

          const response = await window.api.sendMessage(content)
          await this.addMessage(response.content, 'assistant')
        } catch (err) {
          this.error = err.message
        } finally {
          this.isLoading = false
        }
      }
    },

    async checkModelStatus() {
      try {
        // 这里应该调用实际的模型检查逻辑
        // 暂时返回 true
        return true
      } catch (error) {
        console.error('Failed to check model status:', error)
        return false
      }
    },

    loadFromLocalStorage() {
      console.log('loadFromLocalStorage called')
      try {
        const savedData = localStorage.getItem('chat-conversations')
        const savedCurrentId = localStorage.getItem('chat-current-id')
        
        if (savedData) {
          this.conversations = JSON.parse(savedData)
          
          // 如果有保存的当前会话ID且该会话仍然存在，则使用它
          if (savedCurrentId && this.conversations.find(conv => conv.id === Number(savedCurrentId))) {
            this.currentConversationId = Number(savedCurrentId)
          } 
          // 否则使用最后一个会话
          else if (this.conversations.length > 0) {
            this.currentConversationId = this.conversations[this.conversations.length - 1].id
          }
        }
      } catch (err) {
        console.error('Failed to load from localStorage:', err)
        this.error = '加载聊天历史失败'
      }
    },

    saveToLocalStorage() {
      try {
        localStorage.setItem('chat-conversations', JSON.stringify(this.conversations))
        localStorage.setItem('chat-current-id', this.currentConversationId)
      } catch (err) {
        console.error('Failed to save to localStorage:', err)
        this.error = '保存聊天记录失败'
      }
    },

    reset() {
      this.conversations = []
      this.currentConversationId = null
      this.isLoading = false
      this.error = null
      this.saveToLocalStorage()
    }
  }
})

// 打印 store 定义
if (process.env.NODE_ENV === 'development') {
  const storeActions = [
    'createConversation',
    'createNewConversation',
    'selectConversation',
    'updateConversationTitle',
    'deleteConversation',
    'addMessage',
    'checkModelStatus',
    'loadFromLocalStorage',
    'saveToLocalStorage',
    'reset'
  ]
  console.log('Store defined with actions:', storeActions)
}
