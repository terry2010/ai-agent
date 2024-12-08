// 使用 preload.js 中定义的 API
const api = window.api

export const checkOllamaStatus = async () => {
  try {
    return await api.checkOllamaStatus()
  } catch (error) {
    console.error('Error checking Ollama status:', error)
    return false
  }
}

export const generateResponse = async (prompt, model) => {
  try {
    return await api.generateResponse({ prompt, model })
  } catch (error) {
    console.error('Error generating response:', error)
    throw error
  }
}
