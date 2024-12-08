const { contextBridge, ipcRenderer } = require('electron')

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('api', {
  // 连接检查
  checkConnection: () => ipcRenderer.invoke('check-connection'),
  
  // 模型管理
  checkModel: (modelId) => ipcRenderer.invoke('check-model', modelId),
  listModels: () => ipcRenderer.invoke('list-models'),
  pullModel: (modelId) => ipcRenderer.invoke('pull-model', modelId),
  deleteModel: (modelId) => ipcRenderer.invoke('delete-model', modelId),
  
  // AI 响应生成
  generateResponse: (params) => ipcRenderer.invoke('generate-response', params),
  
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
  }
})
