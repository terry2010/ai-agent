<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="设置"
    width="500px"
    :before-close="handleClose"
  >
    <el-tabs>
      <!-- 模型设置 -->
      <el-tab-pane label="模型设置">
        <el-form label-width="120px">
          <el-form-item label="默认模型">
            <el-select v-model="settings.defaultModel" placeholder="选择默认模型">
              <el-option label="CodeLlama" value="codellama" />
              <el-option label="Llama2" value="llama2" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="模型地址">
            <el-input v-model="settings.modelEndpoint" placeholder="例如：http://localhost:11434" />
          </el-form-item>
          
          <el-form-item label="超时设置(秒)">
            <el-input-number v-model="settings.timeout" :min="1" :max="60" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 界面设置 -->
      <el-tab-pane label="界面设置">
        <el-form label-width="120px">
          <el-form-item label="主题">
            <el-radio-group v-model="settings.theme">
              <el-radio label="light">浅色</el-radio>
              <el-radio label="dark">深色</el-radio>
              <el-radio label="system">跟随系统</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="字体大小">
            <el-select v-model="settings.fontSize">
              <el-option label="小" value="small" />
              <el-option label="中" value="medium" />
              <el-option label="大" value="large" />
            </el-select>
          </el-form-item>

          <el-form-item label="消息显示数量">
            <el-input-number v-model="settings.messageLimit" :min="10" :max="100" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 高级设置 -->
      <el-tab-pane label="高级设置">
        <el-form label-width="120px">
          <el-form-item label="日志级别">
            <el-select v-model="settings.logLevel">
              <el-option label="调试" value="debug" />
              <el-option label="信息" value="info" />
              <el-option label="警告" value="warn" />
              <el-option label="错误" value="error" />
            </el-select>
          </el-form-item>

          <el-form-item label="自动保存">
            <el-switch v-model="settings.autoSave" />
          </el-form-item>

          <el-form-item label="保存间隔(分钟)" v-if="settings.autoSave">
            <el-input-number v-model="settings.saveInterval" :min="1" :max="60" />
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
        <el-button type="danger" @click="resetToDefaults">重置</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { handleError, ErrorTypes } from '../utils/error'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['update:visible'])
const settingsStore = useSettingsStore()

// 默认设置
const defaultSettings = {
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

// 设置数据
const settings = ref({ ...defaultSettings })

// 初始化设置
const initSettings = async () => {
  try {
    const savedSettings = await settingsStore.getSettings()
    if (savedSettings) {
      settings.value = { ...defaultSettings, ...savedSettings }
    }
  } catch (error) {
    handleError(error, ErrorTypes.UNKNOWN_ERROR)
  }
}

// 保存设置
const saveSettings = async () => {
  try {
    await settingsStore.saveSettings(settings.value)
    emit('update:visible', false)
  } catch (error) {
    handleError(error, ErrorTypes.UNKNOWN_ERROR)
  }
}

// 重置设置
const resetToDefaults = async () => {
  try {
    settings.value = { ...defaultSettings }
    await settingsStore.saveSettings(settings.value)
  } catch (error) {
    handleError(error, ErrorTypes.UNKNOWN_ERROR)
  }
}

// 关闭对话框
const handleClose = () => {
  emit('update:visible', false)
}

// 组件挂载时初始化设置
onMounted(initSettings)
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-radio-group) {
  display: flex;
  gap: 20px;
}
</style>
