const axios = require('axios')
const EventEmitter = require('events')
const logger = require('./logger')

class OllamaService extends EventEmitter {
  constructor() {
    super()
    this.baseURL = 'http://127.0.0.1:11434'  // 使用 127.0.0.1 替代 localhost
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000,  // 增加超时时间到 60 秒
      proxy: false,
      responseType: 'stream'  // 设置响应类型为 stream
    })
    this.setupInterceptors()
    this.requestQueue = []
    this.activeRequests = 0
    this.maxConcurrent = 3
    this.modelStatus = new Map()
    this.healthCheckInterval = null
  }

  setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      config => {
        logger.debug(`Making request to ${config.url}`)
        return config
      },
      error => {
        logger.error('Request interceptor error:', { 
          message: error.message,
          code: error.code
        })
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.client.interceptors.response.use(
      response => {
        logger.debug(`Received response from ${response.config.url}`)
        return response
      },
      error => {
        if (error.response) {
          logger.error('Response error:', { 
            status: error.response.status,
            data: error.response.data,
            url: error.config.url
          })
        } else if (error.request) {
          logger.error('Request error:', { 
            message: error.message,
            code: error.code
          })
        } else {
          logger.error('Error:', { 
            message: error.message
          })
        }
        return Promise.reject(error)
      }
    )
  }

  // 请求队列管理
  async enqueueRequest(request) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        request,
        resolve,
        reject,
        retries: 3
      }
      this.requestQueue.push(queueItem)
      this.processQueue()
    })
  }

  async processQueue() {
    if (this.activeRequests >= this.maxConcurrent || this.requestQueue.length === 0) {
      return
    }

    this.activeRequests++
    const item = this.requestQueue.shift()

    try {
      const result = await this.executeRequest(item.request)
      item.resolve(result)
    } catch (error) {
      if (item.retries > 0) {
        item.retries--
        this.requestQueue.unshift(item)
        logger.warn(`Request failed, retrying... (${item.retries} retries left)`)
      } else {
        item.reject(new Error(error.message || '请求失败'))
      }
    } finally {
      this.activeRequests--
      this.processQueue()
    }
  }

  async executeRequest(request) {
    try {
      const result = await request()
      return result
    } catch (error) {
      logger.error('Request execution failed:', {
        message: error.message,
        code: error.code
      })
      if (error.code === 'ECONNREFUSED') {
        // 尝试使用备用地址
        if (this.client.defaults.baseURL.includes('localhost')) {
          logger.info('Switching to 127.0.0.1...')
          this.client.defaults.baseURL = this.client.defaults.baseURL.replace('localhost', '127.0.0.1')
          return await request()
        }
        throw new Error('Ollama 服务未运行或无法访问 (端口 11434)')
      }
      throw new Error(error.message || '请求失败')
    }
  }

  // 模型管理 API
  async listModels() {
    return this.enqueueRequest(async () => {
      try {
        logger.debug('Fetching models list...')
        const response = await this.client.get('/api/tags')
        
        // 确保我们有响应数据
        if (!response || !response.data) {
          throw new Error('No response data received')
        }

        // 如果响应数据是一个流，我们需要读取它
        if (response.data._readableState) {
          const chunks = []
          for await (const chunk of response.data) {
            chunks.push(chunk)
          }
          const rawData = Buffer.concat(chunks).toString('utf8')
          try {
            response.data = JSON.parse(rawData)
          } catch (e) {
            logger.error('Failed to parse response data:', e)
            throw new Error('Invalid JSON response')
          }
        }

        logger.debug('Parsed response data:', response.data)

        // 验证数据格式
        if (!response.data.models || !Array.isArray(response.data.models)) {
          logger.error('Invalid response format:', response.data)
          throw new Error('Invalid response format from Ollama service')
        }

        const models = response.data.models.map(model => ({
          name: model.name,
          modified: model.modified_at || model.modified,
          size: model.size,
          details: model.details || ''
        }))

        logger.debug(`Found ${models.length} models:`, 
          models.map(m => m.name).join(', '))
        
        return {
          models
        }
      } catch (error) {
        logger.error('Failed to fetch models:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        })
        throw error
      }
    })
  }

  async pullModel(name) {
    return this.enqueueRequest(async () => {
      const response = await this.client.post('/api/pull', { name })
      return response.data
    })
  }

  async deleteModel(name) {
    return this.enqueueRequest(async () => {
      const response = await this.client.delete('/api/delete', { data: { name } })
      return response.data
    })
  }

  async getModelInfo(name) {
    return this.enqueueRequest(async () => {
      const response = await this.client.post('/api/show', { name })
      return response.data
    })
  }

  async checkModel(modelName) {
    return this.enqueueRequest(async () => {
      try {
        logger.debug(`Checking model status: ${modelName}`)
        const models = await this.listModels()
        const model = models.models.find(m => m.name === modelName)
        
        if (!model) {
          throw new Error(`Model ${modelName} not found`)
        }

        return true
      } catch (error) {
        logger.error(`Failed to check model ${modelName}:`, error)
        throw error
      }
    })
  }

  async generateResponse(content, model) {
    return this.enqueueRequest(async () => {
      try {
        logger.info(`Generating response using model: ${model}`)
        logger.debug('Content:', content.substring(0, 100))

        const response = await this.client.post('/api/generate', {
          model: model,
          prompt: content,
          stream: true
        })

        if (!response.data || !response.data._readableState) {
          throw new Error('Invalid response format: expected a readable stream')
        }

        let responseText = ''
        let buffer = ''

        for await (const chunk of response.data) {
          buffer += chunk.toString()
          const lines = buffer.split('\n')
          
          // 处理除最后一行外的所有完整行
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i]
            if (!line) continue

            try {
              const data = JSON.parse(line)
              if (data.response) {
                responseText += data.response
                this.emit('response-chunk', {
                  chunk: data.response,
                  done: data.done || false
                })
                
                if (data.done) {
                  logger.info('Response generation completed')
                  return responseText
                }
              }
              if (data.error) {
                throw new Error(data.error)
              }
            } catch (e) {
              if (e.name === 'SyntaxError') {
                logger.warn('Failed to parse JSON line:', line)
                continue
              }
              throw e
            }
          }
          
          // 保留最后一个可能不完整的行
          buffer = lines[lines.length - 1]
        }

        // 处理最后剩余的数据
        if (buffer) {
          try {
            const data = JSON.parse(buffer)
            if (data.response) {
              responseText += data.response
              this.emit('response-chunk', {
                chunk: data.response,
                done: true
              })
            }
          } catch (e) {
            logger.warn('Failed to parse final buffer:', buffer)
          }
        }

        return responseText
      } catch (error) {
        logger.error('Failed to generate response:', error)
        throw error
      }
    })
  }

  async checkStatus() {
    try {
      logger.info('Checking Ollama service status...')
      const response = await axios({
        method: 'get',
        url: `${this.baseURL}/api/tags`,
        responseType: 'json',
        timeout: 5000
      })
      
      logger.debug('Ollama service response:', response.data)
      
      // 确保响应数据是一个对象
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid response format from Ollama service')
      }
      
      // 获取模型列表，如果 models 不存在则使用空数组
      const models = Array.isArray(response.data.models) ? response.data.models : []
      
      logger.info(`Ollama service is running, found ${models.length} models`)
      return { 
        connected: true, 
        models: models,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      logger.error('Ollama service check failed:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      })
      
      const message = error.code === 'ECONNREFUSED' 
        ? '无法连接到 Ollama 服务，请确保服务正在运行'
        : `连接 Ollama 服务失败: ${error.message}`
      
      return { 
        connected: false, 
        error: message,
        timestamp: new Date().toISOString()
      }
    }
  }

  async checkModelHealth(name) {
    try {
      const info = await this.getModelInfo(name)
      const status = {
        available: true,
        size: info.size,
        digest: info.digest,
        modified: info.modified
      }
      this.modelStatus.set(name, status)
      this.emit('modelStatusChanged', name, status)
      return status
    } catch (error) {
      const status = { available: false, error: error.message }
      this.modelStatus.set(name, status)
      this.emit('modelStatusChanged', name, status)
      return status
    }
  }

  startHealthCheck(interval = 60000) {
    if (this.healthCheckInterval) {
      return
    }

    this.healthCheckInterval = setInterval(async () => {
      const status = await this.checkStatus()
      if (status.connected && status.models) {
        for (const model of status.models) {
          await this.checkModelHealth(model.name)
        }
      }
    }, interval)
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  on(event, callback) {
    this.addListener(event, callback)
    return () => {
      this.removeListener(event, callback)
    }
  }
}

module.exports = new OllamaService()
