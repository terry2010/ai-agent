import { defineStore } from 'pinia'
import { ref } from 'vue'
import { checkOllamaStatus, generateResponse } from '../utils/ipc'

export const useChatStore = defineStore('chat', () => {
  const messages = ref([])
  const currentConversationId = ref(null)
  const conversations = ref([])
  const modelConnected = ref(false)
  const selectedModel = ref('codellama')

  // 检查模型状态
  async function checkModelStatus() {
    modelConnected.value = await checkOllamaStatus()
    return modelConnected.value
  }

  function addMessage(message) {
    messages.value.push({
      id: Date.now(),
      content: message.content,
      isAI: message.isAI,
      timestamp: Date.now()
    })
  }

  async function sendMessage(content) {
    // 添加用户消息
    addMessage({
      content,
      isAI: false
    })

    try {
      // 获取AI响应
      const response = await generateResponse(content, selectedModel.value)
      addMessage({
        content: response,
        isAI: true
      })
    } catch (error) {
      console.error('Error getting AI response:', error)
      addMessage({
        content: '抱歉，生成响应时出现错误。',
        isAI: true
      })
    }
  }

  function createNewConversation() {
    const id = Date.now()
    conversations.value.push({
      id,
      title: `对话 ${conversations.value.length + 1}`,
      createdAt: new Date()
    })
    currentConversationId.value = id
    messages.value = []
    return id
  }

  function loadConversation(id) {
    currentConversationId.value = id
    // TODO: 从存储加载对话历史
    messages.value = []
  }

  return {
    messages,
    currentConversationId,
    conversations,
    modelConnected,
    selectedModel,
    addMessage,
    createNewConversation,
    loadConversation,
    checkModelStatus,
    sendMessage
  }
})
