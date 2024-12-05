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

function setupIPC() {
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

  // 生成 AI 响应
  ipcMain.handle('generate-response', async (event, { prompt, model }) => {
    try {
      logger.debug(`Generating response for model: ${model}`)
      const response = await ollamaService.generateResponse(prompt, model)
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

  logger.info('IPC handlers setup completed')
}

module.exports = {
  setupIPC
}
