import { defineStore } from 'pinia'
import { ref } from 'vue'
import { handleError, ErrorTypes } from '../utils/error'
import { getSettings as getSettingsFromIPC, saveSettings as saveSettingsToIPC, resetSettings as resetSettingsFromIPC } from '../utils/settings'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(null)

  // 获取设置
  async function getSettings() {
    if (settings.value) return settings.value

    try {
      const savedSettings = await getSettingsFromIPC()
      if (savedSettings) {
        settings.value = savedSettings
      }
      return settings.value
    } catch (error) {
      handleError(error, ErrorTypes.UNKNOWN_ERROR)
      return null
    }
  }

  // 保存设置
  async function saveSettings(newSettings) {
    try {
      await saveSettingsToIPC(newSettings)
      settings.value = newSettings
      
      // 应用设置
      applySettings(newSettings)
      
      return true
    } catch (error) {
      handleError(error, ErrorTypes.UNKNOWN_ERROR)
      return false
    }
  }

  // 应用设置
  function applySettings(newSettings) {
    // 应用主题
    document.documentElement.setAttribute('data-theme', newSettings.theme)
    
    // 应用字体大小
    document.documentElement.style.fontSize = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }[newSettings.fontSize] || '16px'
    
    // 其他设置应用...
  }

  // 重置设置
  async function resetSettings() {
    try {
      await resetSettingsFromIPC()
      settings.value = null
      return true
    } catch (error) {
      handleError(error, ErrorTypes.UNKNOWN_ERROR)
      return false
    }
  }

  return {
    settings,
    getSettings,
    saveSettings,
    resetSettings,
    applySettings
  }
})
