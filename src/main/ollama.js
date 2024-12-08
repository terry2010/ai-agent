const axios = require('axios')
const EventEmitter = require('events')
const logger = require('./logger')

class OllamaService extends EventEmitter {
  constructor() {
    super()
    this.baseURL = 'http://localhost:11434'
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000
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
        logger.info(`Ollama API Request: ${config.method.toUpperCase()} ${config.url}`)
        return config
      },
      error => {
        logger.error('Request error:', error)
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.client.interceptors.response.use(
      response => {
        logger.info(`Ollama API Response: ${response.status} ${response.statusText}`)
        return response
      },
      error => {
        logger.error('Response error:', error)
        if (error.response) {
          const { status, data } = error.response
          throw new Error(`API Error: ${status} - ${data.error || 'Unknown error'}`)
        }
        throw error
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
        item.reject(error)
      }
    } finally {
      this.activeRequests--
      this.processQueue()
    }
  }

  async executeRequest(request) {
    try {
      return await request()
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama service is not running')
      }
      throw error
    }
  }

  // 模型管理 API
  async listModels() {
    return this.enqueueRequest(async () => {
      const response = await this.client.get('/api/tags')
      return response.data.models
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

  // 生成响应
  async generateResponse(prompt, model = 'codellama', options = {}) {
    return this.enqueueRequest(async () => {
      const response = await this.client.post('/api/generate', {
        model,
        prompt,
        stream: true,
        ...options
      })
      return response.data
    })
  }

  // 模型状态检测
  async checkStatus() {
    try {
      const models = await this.listModels()
      return { connected: true, models }
    } catch (error) {
      logger.error('Ollama service check failed:', error)
      return { connected: false, error: error.message }
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
}

module.exports = new OllamaService()
