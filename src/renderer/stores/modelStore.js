import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useModelStore = defineStore('model', () => {
  // 状态
  const currentModel = ref('') // 当前选择的模型
  const status = ref('disconnected') // 连接状态
  const error = ref('') // 错误信息
  const retryCount = ref(0) // 重试次数
  const maxRetries = 3 // 最大重试次数
  const modelStatuses = ref({}) // 模型状态缓存
  const isLoading = ref(false) // 加载状态

  // 错误类型枚举
  const ErrorTypes = {
    CONNECTION: 'CONNECTION_ERROR',
    MODEL_LOADING: 'MODEL_LOADING_ERROR',
    TIMEOUT: 'TIMEOUT_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
  }

  // 可用模型列表
  const availableModels = ref([])

  // 计算属性
  const selectedModel = computed(() => {
    return availableModels.value.find(model => model.id === currentModel.value)
  })

  const isConnected = computed(() => status.value === 'connected')
  const isModelLoading = computed(() => isLoading.value)

  // 动作
  const setStatus = (newStatus) => {
    status.value = newStatus
    if (newStatus === 'connected') {
      error.value = ''
      retryCount.value = 0
    }
  }

  const setError = (message, type = ErrorTypes.UNKNOWN) => {
    error.value = message
    setStatus('error')
    if (type === ErrorTypes.CONNECTION && retryCount.value < maxRetries) {
      retryCount.value++
      setTimeout(retryConnection, 1000 * retryCount.value)
    }
  }

  const setCurrentModel = async (modelId) => {
    try {
      isLoading.value = true
      const modelStatus = await window.api.checkModel(modelId)
      
      if (!modelStatus.available) {
        // 如果模型不可用，尝试拉取
        await pullModel(modelId)
      }

      currentModel.value = modelId
      modelStatuses.value[modelId] = modelStatus
      setStatus('connected')
    } catch (err) {
      setError(err.message, ErrorTypes.MODEL_LOADING)
    } finally {
      isLoading.value = false
    }
  }

  const fetchModels = async () => {
    try {
      isLoading.value = true
      const response = await window.api.listModels()
      availableModels.value = response.models.map(model => ({
        id: model.name,
        name: model.name,
        description: model.details || '无描述',
        status: modelStatuses.value[model.name] || { available: false }
      }))
    } catch (err) {
      setError(err.message, ErrorTypes.CONNECTION)
    } finally {
      isLoading.value = false
    }
  }

  const pullModel = async (modelId) => {
    try {
      isLoading.value = true
      await window.api.pullModel(modelId)
      await fetchModels() // 刷新模型列表
    } catch (err) {
      setError(err.message, ErrorTypes.MODEL_LOADING)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteModel = async (modelId) => {
    try {
      isLoading.value = true
      await window.api.deleteModel(modelId)
      await fetchModels() // 刷新模型列表
      
      if (currentModel.value === modelId) {
        currentModel.value = ''
      }
    } catch (err) {
      setError(err.message, ErrorTypes.UNKNOWN)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const checkConnection = async () => {
    try {
      setStatus('connecting')
      const response = await window.api.checkConnection()
      
      if (response.connected) {
        setStatus('connected')
        await fetchModels()
      } else {
        setError('无法连接到 Ollama 服务', ErrorTypes.CONNECTION)
      }
    } catch (err) {
      setError(err.message, ErrorTypes.CONNECTION)
    }
  }

  const retryConnection = async () => {
    await checkConnection()
  }

  // 处理模型状态变更
  const handleModelStatusChange = (modelId, newStatus) => {
    modelStatuses.value[modelId] = newStatus
    
    // 更新可用模型列表中的状态
    const modelIndex = availableModels.value.findIndex(m => m.id === modelId)
    if (modelIndex !== -1) {
      availableModels.value[modelIndex] = {
        ...availableModels.value[modelIndex],
        status: newStatus
      }
    }
  }

  // 初始化监听器
  const initializeListeners = () => {
    if (window.api?.onModelStatusChange) {
      window.api.onModelStatusChange(handleModelStatusChange)
    }
  }

  // 测试辅助方法
  const reset = () => {
    currentModel.value = ''
    status.value = 'disconnected'
    error.value = ''
    retryCount.value = 0
    modelStatuses.value = {}
    isLoading.value = false
    availableModels.value = []
  }

  // 在 store 创建后初始化监听器
  initializeListeners()

  return {
    // 状态
    currentModel,
    status,
    error,
    availableModels,
    modelStatuses,
    isLoading,
    
    // 计算属性
    selectedModel,
    isConnected,
    isModelLoading,
    
    // 动作
    setCurrentModel,
    fetchModels,
    pullModel,
    deleteModel,
    checkConnection,
    retryConnection,
    reset,
    initializeListeners,
    
    // 错误类型
    ErrorTypes
  }
})
