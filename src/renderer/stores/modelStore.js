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
      console.log('=== Store: Fetching models started ===')
      const response = await window.api.listModels()
      console.log('=== Store: Received models from IPC ===')
      console.log('Models:', response)
      
      // 确保 response 包含模型数据
      if (!response || !Array.isArray(response)) {
        console.error('Invalid response:', response)
        throw new Error('无效的模型数据')
      }

      availableModels.value = response.map(model => ({
        id: model.name,
        name: model.name,
        description: model.details || '无描述',
        status: modelStatuses.value[model.name] || { available: true }
      }))

      console.log('=== Store: Models processed ===')
      console.log('Processed models:', availableModels.value)

      // 如果没有选择模型，自动选择第一个
      if (!currentModel.value && availableModels.value.length > 0) {
        console.log('=== Store: Auto-selecting first model ===')
        await setCurrentModel(availableModels.value[0].id)
      }
    } catch (err) {
      console.error('=== Store: Error fetching models ===')
      console.error('Error:', err)
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
        // 更新模型列表
        if (response.models) {
          availableModels.value = response.models.map(model => ({
            id: model.name,
            name: model.name,
            description: model.details || '无描述',
            status: modelStatuses.value[model.name] || { available: true }
          }))
        }
        // 如果没有选择模型，自动选择第一个可用的模型
        if (!currentModel.value && availableModels.value.length > 0) {
          await setCurrentModel(availableModels.value[0].id)
        }
      } else {
        setError(response.error || '无法连接到 Ollama 服务', ErrorTypes.CONNECTION)
      }
    } catch (err) {
      setError(err.message, ErrorTypes.CONNECTION)
    }
  }

  const retryConnection = async () => {
    if (retryCount.value >= maxRetries) {
      setError('已达到最大重试次数，请检查 Ollama 服务是否正在运行', ErrorTypes.CONNECTION)
      return
    }
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
    availableModels,
    error,
    isLoading,
    isConnected,
    selectedModel,

    // 动作
    setCurrentModel,
    fetchModels,
    pullModel,
    deleteModel,
    checkConnection,
    retryConnection,
    handleModelStatusChange,
    reset
  }
})
