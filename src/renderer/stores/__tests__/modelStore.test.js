import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useModelStore } from '../modelStore'

describe('modelStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 模拟 window.api
    vi.stubGlobal('window', {
      api: {
        checkModel: vi.fn(),
        checkConnection: vi.fn()
      }
    })
  })

  it('should initialize with default values', () => {
    const store = useModelStore()
    expect(store.currentModel).toBe('')
    expect(store.isConnected).toBe(false)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.availableModels.length).toBeGreaterThan(0)
  })

  it('should set current model', async () => {
    const store = useModelStore()
    window.api.checkModel.mockResolvedValue({ status: 'ready' })

    await store.setCurrentModel('codellama')
    
    expect(store.currentModel).toBe('codellama')
    expect(store.isConnected).toBe(true)
    expect(store.error).toBeNull()
  })

  it('should handle model error', async () => {
    const store = useModelStore()
    window.api.checkModel.mockRejectedValue(new Error('Model not found'))

    await store.setCurrentModel('invalid-model')
    
    expect(store.currentModel).toBe('')
    expect(store.isConnected).toBe(false)
    expect(store.error).toBe('Model not found')
  })

  it('should check connection status', async () => {
    const store = useModelStore()
    window.api.checkConnection.mockResolvedValue({ connected: true })

    await store.checkConnection()
    
    expect(store.isConnected).toBe(true)
    expect(store.error).toBeNull()
  })

  it('should handle connection error', async () => {
    const store = useModelStore()
    window.api.checkConnection.mockRejectedValue(new Error('Connection failed'))

    await store.checkConnection()
    
    expect(store.isConnected).toBe(false)
    expect(store.error).toBe('Connection failed')
  })

  it('should return selected model', () => {
    const store = useModelStore()
    store.currentModel = 'codellama'
    
    const selected = store.selectedModel
    expect(selected).toBeDefined()
    expect(selected.id).toBe('codellama')
  })
})
