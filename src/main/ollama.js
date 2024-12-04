const axios = require('axios')

class OllamaService {
  constructor() {
    this.baseURL = 'http://localhost:11434'
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000
    })
  }

  async checkStatus() {
    try {
      await this.client.get('/api/tags')
      return true
    } catch (error) {
      console.error('Ollama service check failed:', error)
      return false
    }
  }

  async generateResponse(prompt, model = 'codellama') {
    try {
      const response = await this.client.post('/api/generate', {
        model,
        prompt,
        stream: true
      })
      return response.data
    } catch (error) {
      console.error('Generate response failed:', error)
      throw error
    }
  }
}

module.exports = new OllamaService()
