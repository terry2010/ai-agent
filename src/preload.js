const { contextBridge, ipcRenderer } = require('electron')

// 暴露 electron API 到渲染进程
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
  },
  // 模型相关
  checkOllamaStatus: () => ipcRenderer.invoke('check-ollama-status'),
  generateResponse: (params) => ipcRenderer.invoke('generate-response', params),
  // 设置相关
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  resetSettings: () => ipcRenderer.invoke('reset-settings')
})
