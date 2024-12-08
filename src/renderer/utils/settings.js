// 使用 preload.js 中定义的 API
const api = window.api

// 获取设置
export async function getSettings() {
  try {
    return await api.getSettings()
  } catch (error) {
    console.error('Failed to get settings:', error)
    throw error
  }
}

// 保存设置
export async function saveSettings(settings) {
  try {
    return await api.saveSettings(settings)
  } catch (error) {
    console.error('Failed to save settings:', error)
    throw error
  }
}

// 重置设置
export async function resetSettings() {
  try {
    return await api.resetSettings()
  } catch (error) {
    console.error('Failed to reset settings:', error)
    throw error
  }
}
