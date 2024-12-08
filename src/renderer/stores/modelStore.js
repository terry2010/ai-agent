import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useModelStore = defineStore('model', {
  state: () => ({
    models: [],
    currentModel: null,
    loading: false,
    error: null,
    isConnected: false
  }),

  actions: {
    async fetchModels() {
      this.loading = true
      this.error = null
      
      try {
        console.log('Fetching models...')
        const status = await window.api.checkConnection()
        console.log('Connection status:', status)
        
        if (!status.connected) {
          throw new Error(status.error || '无法连接到 Ollama 服务')
        }
        
        this.isConnected = true
        const response = await window.api.listModels()
        console.log('Response from listModels:', response)
        
        if (response && response.models && Array.isArray(response.models)) {
          console.log('Setting models:', response.models)
          this.models = response.models
          
          // 如果没有选择模型且有可用模型，选择第一个
          if (!this.currentModel && this.models.length > 0) {
            console.log('Auto-selecting first model:', this.models[0].name)
            await this.setCurrentModel(this.models[0].name)
          }
        } else {
          console.error('Invalid response format:', response)
          throw new Error('无效的响应格式')
        }
      } catch (error) {
        console.error('Error in fetchModels:', error)
        this.error = error.message
        this.isConnected = false
      } finally {
        this.loading = false
      }
    },

    async setCurrentModel(modelName) {
      console.log('Setting current model:', modelName)
      try {
        // 确保模型存在
        const modelExists = this.models.some(model => model.name === modelName)
        if (!modelExists) {
          console.error(`Model ${modelName} not found in:`, this.models)
          throw new Error(`模型 ${modelName} 不存在`)
        }
        
        // 检查模型状态
        const status = await this.checkModelStatus(modelName)
        if (!status.available) {
          throw new Error(status.error || `模型 ${modelName} 未就绪`)
        }
        
        this.currentModel = modelName
        console.log('Current model set to:', this.currentModel)
      } catch (error) {
        console.error('Error setting current model:', error)
        this.error = error.message
        throw error
      }
    },

    async checkModelStatus(modelName) {
      try {
        const status = await window.api.checkModel(modelName)
        return status
      } catch (error) {
        console.error(`Failed to check model status for ${modelName}:`, error)
        throw error
      }
    },

    async pullModel(modelName) {
      try {
        await window.api.pullModel(modelName)
        await this.fetchModels()
      } catch (error) {
        console.error(`Failed to pull model ${modelName}:`, error)
        throw error
      }
    },

    async deleteModel(modelName) {
      try {
        await window.api.deleteModel(modelName)
        // 如果删除的是当前选中的模型，清除选择
        if (this.currentModel === modelName) {
          this.currentModel = null
        }
        // 更新模型列表
        await this.fetchModels()
      } catch (error) {
        console.error(`Failed to delete model ${modelName}:`, error)
        throw error
      }
    }
  }
})
