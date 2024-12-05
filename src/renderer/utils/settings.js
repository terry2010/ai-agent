const { ipcRenderer } = window.electron

// 获取设置
export async function getSettings() {
  try {
    return await ipcRenderer.invoke('get-settings')
  } catch (error) {
    console.error('Failed to get settings:', error)
    throw error
  }
}

// 保存设置
export async function saveSettings(settings) {
  try {
    return await ipcRenderer.invoke('save-settings', settings)
  } catch (error) {
    console.error('Failed to save settings:', error)
    throw error
  }
}

// 重置设置
export async function resetSettings() {
  try {
    return await ipcRenderer.invoke('reset-settings')
  } catch (error) {
    console.error('Failed to reset settings:', error)
    throw error
  }
}
