// 使用 contextBridge 和 ipcRenderer 进行通信
const { ipcRenderer } = window.electron

export const checkOllamaStatus = async () => {
  try {
    return await ipcRenderer.invoke('check-ollama-status')
  } catch (error) {
    console.error('Error checking Ollama status:', error)
    return false
  }
}

export const generateResponse = async (prompt, model) => {
  try {
    return await ipcRenderer.invoke('generate-response', { prompt, model })
  } catch (error) {
    console.error('Error generating response:', error)
    throw error
  }
}
