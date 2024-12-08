const { contextBridge, ipcRenderer } = require('electron')

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('api', {
  // 检查连接状态
  checkConnection: () => ipcRenderer.invoke('check-connection'),
  
  // 发送消息
  sendMessage: (content, model) => ipcRenderer.invoke('send-message', { content, model }),
  
  // 监听流式响应
  onResponseChunk: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('response-chunk', handler)
    return () => ipcRenderer.removeListener('response-chunk', handler)
  },
  
  // 列出模型
  listModels: () => ipcRenderer.invoke('list-models'),
  
  // 拉取模型
  pullModel: (modelId) => ipcRenderer.invoke('pull-model', modelId),
  
  // 删除模型
  deleteModel: (modelId) => ipcRenderer.invoke('delete-model', modelId),
  
  // 检查模型状态
  checkModel: (modelId) => ipcRenderer.invoke('check-model', modelId),
  
  // 监听模型状态变化
  onModelStatusChange: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('model-status-changed', handler)
    return () => ipcRenderer.removeListener('model-status-changed', handler)
  }
})
