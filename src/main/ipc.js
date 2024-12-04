const { ipcMain } = require('electron')
const ollamaService = require('./ollama')
const logger = require('./logger')

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

  logger.info('IPC handlers setup completed')
}

module.exports = {
  setupIPC
}
