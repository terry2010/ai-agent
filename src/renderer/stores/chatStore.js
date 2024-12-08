import { defineStore } from 'pinia'

export const useChatStore = defineStore('chat', {
  state: () => ({
    conversations: [],
    currentConversationId: null,
    isLoading: false,
    error: null
  }),

  getters: {
    currentConversation(state) {
      return state.conversations.find(conv => conv.id === state.currentConversationId)
    },
    currentMessages(state) {
      return this.currentConversation?.messages || []
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
      
      return newConversation
    },

    selectConversation(id) {
      const conversation = this.conversations.find(conv => conv.id === id)
      if (conversation) {
        this.currentConversationId = id
      }
    },

    updateConversationTitle(id, title) {
      const conversation = this.conversations.find(conv => conv.id === id)
      if (conversation) {
        conversation.title = title
        conversation.updatedAt = new Date().toISOString()
      }
    },

    deleteConversation(id) {
      const index = this.conversations.findIndex(conv => conv.id === id)
      if (index !== -1) {
        this.conversations.splice(index, 1)
        if (this.currentConversationId === id) {
          this.currentConversationId = this.conversations[0]?.id || null
        }
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

      this.currentConversation.messages.push(message)
      this.currentConversation.updatedAt = new Date().toISOString()

      if (role === 'user') {
        try {
          this.isLoading = true
          this.error = null

          const response = await window.api.sendMessage(content)
          this.addMessage(response.content, 'assistant')
        } catch (err) {
          this.error = err.message
        } finally {
          this.isLoading = false
        }
      }
    },

    async loadFromLocalStorage() {
      try {
        const savedData = localStorage.getItem('chat-conversations')
        if (savedData) {
          this.conversations = JSON.parse(savedData)
          this.currentConversationId = localStorage.getItem('chat-current-id')
        }
      } catch (err) {
        console.error('Failed to load from localStorage:', err)
        throw err
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

    exportConversation(id) {
      const conversation = this.conversations.find(conv => conv.id === id)
      if (!conversation) return null

      return {
        id: conversation.id,
        title: conversation.title,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    },

    reset() {
      this.conversations = []
      this.currentConversationId = null
      this.isLoading = false
      this.error = null
    }
  }
})
