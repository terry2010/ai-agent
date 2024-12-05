import { ElMessage } from 'element-plus'

export const ErrorTypes = {
  MODEL_CONNECTION: 'MODEL_CONNECTION',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
}

export const ErrorMessages = {
  [ErrorTypes.MODEL_CONNECTION]: '无法连接到模型服务',
  [ErrorTypes.API_ERROR]: 'API 调用失败',
  [ErrorTypes.NETWORK_ERROR]: '网络连接错误',
  [ErrorTypes.UNKNOWN_ERROR]: '发生未知错误'
}

export function handleError(error, type = ErrorTypes.UNKNOWN_ERROR) {
  const message = ErrorMessages[type] || error.message || '发生未知错误'
  
  ElMessage({
    message,
    type: 'error',
    duration: 5000,
    showClose: true
  })

  console.error(`[${type}]`, error)
}
