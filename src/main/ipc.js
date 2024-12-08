const { ipcMain } = require('electron')
const ollamaService = require('./ollama')
const logger = require('./logger')

let store;
(async () => {
  try {
    const Store = (await import('electron-store')).default;
    store = new Store({
      defaults: {
        settings: {
          defaultModel: 'codellama',
          modelEndpoint: 'http://localhost:11434',
          timeout: 30,
          theme: 'light',
          fontSize: 'medium',
          messageLimit: 50,
          logLevel: 'info',
          autoSave: true,
          saveInterval: 5
        }
      }
    });
  } catch (error) {
    logger.error('Error initializing store:', error)
  }
})();

function setupIPC(mainWindow) {
  logger.info('Setting up IPC handlers')

  // 检查 Ollama 服务状态
  ipcMain.handle('check-ollama-status', async () => {
    try {
      logger.debug('Checking Ollama status')
      const status = await ollamaService.checkStatus()
      logger.info(`Ollama status check: ${status ? 'connected' : 'disconnected'}`)
      return status
    } catch (error) {
      logger.error('Error checking Ollama status:', error)
      return false
    }
  })

  // 检查连接状态
  ipcMain.handle('check-connection', async () => {
    try {
      return await ollamaService.checkStatus()
    } catch (error) {
      logger.error('Connection check failed:', error)
      return { connected: false, error: error.message }
    }
  })

  // 发送消息
  ipcMain.handle('send-message', async (event, { content }) => {
    try {
      logger.debug('Sending message:', content)
      const settings = store.get('settings')
      const response = await ollamaService.generateResponse(content, settings.defaultModel)
      logger.debug('Message response received')
      return { content: response }
    } catch (error) {
      logger.error('Error sending message:', error)
      throw error
    }
  })

  // 检查模型状态
  ipcMain.handle('check-model', async (_, modelId) => {
    try {
      return await ollamaService.checkModelHealth(modelId)
    } catch (error) {
      logger.error(`Model check failed for ${modelId}:`, error)
      return { available: false, error: error.message }
    }
  })

  // 获取可用模型列表
  ipcMain.handle('list-models', async () => {
    try {
      logger.info('=== IPC: list-models request started ===')
      const models = await ollamaService.listModels()
      logger.info('=== IPC: Models received from Ollama service ===')
      logger.info('Models data:', JSON.stringify(models, null, 2))
      logger.info('=== IPC: list-models request completed ===')
      return models
    } catch (error) {
      logger.error('=== IPC: list-models request failed ===')
      logger.error('Error details:', error)
      throw error
    }
  })

  // 拉取新模型
  ipcMain.handle('pull-model', async (_, modelId) => {
    try {
      const result = await ollamaService.pullModel(modelId)
      return result
    } catch (error) {
      logger.error(`Pull model failed for ${modelId}:`, error)
      throw error
    }
  })

  // 删除模型
  ipcMain.handle('delete-model', async (_, modelId) => {
    try {
      const result = await ollamaService.deleteModel(modelId)
      return result
    } catch (error) {
      logger.error(`Delete model failed for ${modelId}:`, error)
      throw error
    }
  })

  // 生成 AI 响应
  ipcMain.handle('generate-response', async (event, { prompt, model, options }) => {
    try {
      logger.debug(`Generating response for model: ${model}`)
      const response = await ollamaService.generateResponse(prompt, model, options)
      logger.info('Response generated successfully')
      return response
    } catch (error) {
      logger.error('Error generating response:', error)
      throw error
    }
  })

  // 获取设置
  ipcMain.handle('get-settings', async () => {
    try {
      logger.debug('Getting settings')
      if (!store) {
        throw new Error('Store not initialized')
      }
      const settings = store.get('settings')
      logger.info('Settings retrieved successfully')
      return settings
    } catch (error) {
      logger.error('Error getting settings:', error)
      throw error
    }
  })

  // 保存设置
  ipcMain.handle('save-settings', async (event, settings) => {
    try {
      logger.debug('Saving settings')
      if (!store) {
        throw new Error('Store not initialized')
      }
      store.set('settings', settings)
      logger.info('Settings saved successfully')
      
      // 更新日志级别
      if (settings.logLevel) {
        logger.setLevel(settings.logLevel)
      }
      
      // 更新 Ollama 配置
      if (settings.modelEndpoint) {
        ollamaService.setEndpoint(settings.modelEndpoint)
      }
      
      return true
    } catch (error) {
      logger.error('Error saving settings:', error)
      throw error
    }
  })

  // 重置设置
  ipcMain.handle('reset-settings', async () => {
    try {
      logger.debug('Resetting settings')
      if (!store) {
        throw new Error('Store not initialized')
      }
      store.delete('settings')
      logger.info('Settings reset successfully')
      return true
    } catch (error) {
      logger.error('Error resetting settings:', error)
      throw error
    }
  })

  // 设置模型状态变更监听
  ollamaService.on('modelStatusChanged', (modelId, status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('model-status-changed', { modelId, status })
    }
  })

  // 启动模型健康检查
  ollamaService.startHealthCheck()

  // 清理函数
  return () => {
    ollamaService.stopHealthCheck()
    ollamaService.removeAllListeners('modelStatusChanged')
  }
}

// 预加载脚本API
const preloadApi = {
  checkConnection: () => ipcMain.invoke('check-connection'),
  checkModel: (modelId) => ipcMain.invoke('check-model', modelId),
  listModels: () => ipcMain.invoke('list-models'),
  pullModel: (modelId) => ipcMain.invoke('pull-model', modelId),
  deleteModel: (modelId) => ipcMain.invoke('delete-model', modelId),
  generateResponse: (params) => ipcMain.invoke('generate-response', params),
  onModelStatusChange: (callback) => {
    const { ipcRenderer } = require('electron')
    ipcRenderer.on('model-status-changed', (_, data) => callback(data.modelId, data.status))
    return () => {
      ipcRenderer.removeAllListeners('model-status-changed')
    }
  }
}

module.exports = {
  setupIPC,
  preloadApi
}
