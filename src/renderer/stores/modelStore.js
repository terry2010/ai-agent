import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useModelStore = defineStore('model', () => {
  // 状态
  const currentModel = ref('') // 当前选择的模型
  const status = ref('disconnected') // 连接状态
  const error = ref('') // 错误信息
  const retryCount = ref(0) // 重试次数
  const maxRetries = 3 // 最大重试次数

  // 错误类型枚举
  const ErrorTypes = {
    CONNECTION: 'CONNECTION_ERROR',
    MODEL_LOADING: 'MODEL_LOADING_ERROR',
    TIMEOUT: 'TIMEOUT_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
  }

  // 可用模型列表
  const availableModels = ref([
    { id: 'codellama', name: 'CodeLlama', description: '代码生成和补全' },
    { id: 'llama2', name: 'Llama2', description: '通用对话' },
    { id: 'gpt-4', name: 'GPT-4', description: '高级对话' }
  ])

  // 计算属性
  const selectedModel = computed(() => {
    return availableModels.value.find(model => model.id === currentModel.value)
  })

  const isConnected = computed(() => status.value === 'connected')
  const isLoading = computed(() => status.value === 'connecting')

  // 动作
  const setStatus = (newStatus) => {
    status.value = newStatus
    if (newStatus === 'connected') {
      error.value = ''
      retryCount.value = 0
    }
  }

  const setError = (message) => {
    error.value = message
    setStatus('error')
    if (retryCount.value < maxRetries) {
      retryCount.value++
      setTimeout(retryConnection, 1000 * retryCount.value)
    }
  }

  const setCurrentModel = async (modelId) => {
    try {
      currentModel.value = modelId
      setStatus('connecting')
      error.value = ''
      
      const response = await Promise.race([
        window.api.checkModel(modelId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('模型检查超时')), 10000)
        )
      ])

      if (response.status === 'ready') {
        setStatus('connected')
      } else {
        setError('模型加载失败')
      }
    } catch (err) {
      setError(err.message || '未知错误')
    }
  }

  const checkConnection = async () => {
    try {
      setStatus('connecting')
      error.value = ''
      
      const response = await Promise.race([
        window.api.checkConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('连接检查超时')), 5000)
        )
      ])

      if (response.connected) {
        setStatus('connected')
      } else {
        setError('连接失败')
      }
    } catch (err) {
      setError(err.message || '连接错误')
    }
  }

  const retryConnection = async () => {
    if (currentModel.value) {
      await setCurrentModel(currentModel.value)
    } else {
      await checkConnection()
    }
  }

  // 测试辅助方法
  const reset = () => {
    currentModel.value = ''
    status.value = 'disconnected'
    error.value = ''
    retryCount.value = 0
  }

  return {
    // 状态
    currentModel,
    status,
    error,
    isConnected,
    isLoading,
    availableModels,
    selectedModel,

    // 动作
    setCurrentModel,
    checkConnection,
    retryConnection,
    setStatus,
    setError,
    reset
  }
})
