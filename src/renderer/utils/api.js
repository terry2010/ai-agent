// 基础配置
const BASE_URL = 'http://localhost:3000/api'

// 通用请求函数
async function request(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || '请求失败')
  }

  return response.json()
}

// 模型相关 API
export const modelApi = {
  // 检查模型连接状态
  checkConnection: () => request('/model/status'),

  // 检查特定模型状态
  checkModel: (modelId) => request(`/model/${modelId}/status`),

  // 获取可用模型列表
  getModels: () => request('/model/list'),

  // 切换模型
  switchModel: (modelId) => request('/model/switch', {
    method: 'POST',
    body: JSON.stringify({ modelId })
  })
}

// 聊天相关 API
export const chatApi = {
  // 发送消息
  sendMessage: (content) => request('/chat/message', {
    method: 'POST',
    body: JSON.stringify({ content })
  }),

  // 获取历史消息
  getHistory: (conversationId) => request(`/chat/history/${conversationId}`),

  // 创建新对话
  createConversation: () => request('/chat/conversation', {
    method: 'POST'
  }),

  // 删除对话
  deleteConversation: (conversationId) => request(`/chat/conversation/${conversationId}`, {
    method: 'DELETE'
  })
}

// 流式响应处理
export async function* streamResponse(content) {
  const response = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  })

  if (!response.ok) {
    throw new Error('流式请求失败')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    yield chunk
  }
}

// 错误处理中间件
export function handleApiError(error) {
  console.error('API Error:', error)
  
  // 网络错误
  if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
    return {
      type: 'error',
      message: '网络连接失败，请检查网络设置'
    }
  }

  // 服务器错误
  if (error.response) {
    const status = error.response.status
    if (status === 404) {
      return {
        type: 'error',
        message: '请求的资源不存在'
      }
    }
    if (status === 500) {
      return {
        type: 'error',
        message: '服务器内部错误'
      }
    }
  }

  // 默认错误
  return {
    type: 'error',
    message: error.message || '未知错误'
  }
}
