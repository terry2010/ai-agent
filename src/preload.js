const { contextBridge, ipcRenderer } = require('electron')

// 暴露 electron API 到渲染进程
contextBridge.exposeInMainWorld('electron', {
  checkOllamaStatus: () => ipcRenderer.invoke('check-ollama-status'),
  generateResponse: (params) => ipcRenderer.invoke('generate-response', params)
})
