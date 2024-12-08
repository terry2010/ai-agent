const { contextBridge, ipcRenderer } = require('electron')

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('api', {
  // 连接检查
  checkConnection: () => ipcRenderer.invoke('check-connection'),
  checkOllamaStatus: () => ipcRenderer.invoke('check-ollama-status'),
  
  // 模型管理
  checkModel: (modelId) => ipcRenderer.invoke('check-model', modelId),
  listModels: () => ipcRenderer.invoke('list-models'),
  pullModel: (modelId) => ipcRenderer.invoke('pull-model', modelId),
  deleteModel: (modelId) => ipcRenderer.invoke('delete-model', modelId),
  
  // AI 响应生成
  generateResponse: (params) => ipcRenderer.invoke('generate-response', params),
  sendMessage: (content, model) => ipcRenderer.invoke('send-message', { content, model }),
  
  // 设置管理
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  
  // 模型状态变更监听
  onModelStatusChange: (callback) => {
    const handler = (_, data) => callback(data.modelId, data.status)
    ipcRenderer.on('model-status-changed', handler)
    return () => {
      ipcRenderer.removeListener('model-status-changed', handler)
    }
  },
  
  // 流式响应监听
  onResponseChunk: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('response-chunk', handler)
    return () => {
      ipcRenderer.removeListener('response-chunk', handler)
    }
  }
})
