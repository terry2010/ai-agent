<template>
  <div class="model-manager">
    <div class="model-header">
      <h3>模型管理</h3>
      <el-button 
        type="primary" 
        size="small" 
        @click="refreshModels"
        :loading="isLoading"
        :disabled="!isConnected">
        刷新
      </el-button>
    </div>

    <div class="model-list">
      <el-scrollbar>
        <template v-if="availableModels.length">
          <div v-for="model in availableModels" 
               :key="model.id" 
               class="model-item"
               :class="{ active: model.id === currentModel }">
            <div class="model-info">
              <div class="model-name">
                {{ model.name }}
                <el-tag 
                  size="small" 
                  :type="getStatusType(model.status)">
                  {{ getStatusText(model.status) }}
                </el-tag>
              </div>
              <div class="model-description">{{ model.description }}</div>
            </div>

            <div class="model-actions">
              <template v-if="model.status?.available">
                <el-button 
                  type="primary" 
                  size="small" 
                  text
                  @click="selectModel(model.id)"
                  :disabled="isLoading || model.id === currentModel">
                  使用
                </el-button>
                <el-popconfirm
                  title="确定要删除这个模型吗？"
                  @confirm="deleteModel(model.id)">
                  <template #reference>
                    <el-button 
                      type="danger" 
                      size="small" 
                      text
                      :disabled="isLoading || model.id === currentModel">
                      删除
                    </el-button>
                  </template>
                </el-popconfirm>
              </template>
              <el-button 
                v-else
                type="primary" 
                size="small"
                @click="pullModel(model.id)"
                :loading="isLoading">
                下载
              </el-button>
            </div>
          </div>
        </template>
        <el-empty v-else description="暂无可用模型" />
      </el-scrollbar>
    </div>

    <el-dialog
      v-model="showError"
      title="错误"
      width="30%">
      <span>{{ error }}</span>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showError = false">关闭</el-button>
          <el-button type="primary" @click="handleRetry">
            重试
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useModelStore } from '../../stores/modelStore'
import { ElMessage } from 'element-plus'

const modelStore = useModelStore()
const showError = ref(false)

const {
  currentModel,
  availableModels,
  error,
  isLoading,
  isConnected
} = storeToRefs(modelStore)

// 获取状态类型
const getStatusType = (status) => {
  if (!status) return 'info'
  if (status.error) return 'danger'
  return status.available ? 'success' : 'warning'
}

// 获取状态文本
const getStatusText = (status) => {
  if (!status) return '未知'
  if (status.error) return '错误'
  return status.available ? '可用' : '未下载'
}

// 选择模型
const selectModel = async (modelId) => {
  try {
    await modelStore.setCurrentModel(modelId)
    ElMessage.success('模型切换成功')
  } catch (err) {
    showError.value = true
  }
}

// 拉取模型
const pullModel = async (modelId) => {
  try {
    await modelStore.pullModel(modelId)
    ElMessage.success('模型下载成功')
  } catch (err) {
    showError.value = true
  }
}

// 删除模型
const deleteModel = async (modelId) => {
  try {
    await modelStore.deleteModel(modelId)
    ElMessage.success('模型删除成功')
  } catch (err) {
    showError.value = true
  }
}

// 刷新模型列表
const refreshModels = async () => {
  try {
    await modelStore.fetchModels()
    ElMessage.success('模型列表已更新')
  } catch (err) {
    showError.value = true
  }
}

// 重试操作
const handleRetry = () => {
  showError.value = false
  modelStore.retryConnection()
}

// 监听错误状态
watch(() => error.value, (newError) => {
  if (newError) {
    showError.value = true
  }
})

// 组件加载时获取模型列表
onMounted(async () => {
  if (isConnected.value) {
    await refreshModels()
  }
})
</script>

<style scoped>
.model-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.model-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-light);
}

.model-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.model-list {
  flex: 1;
  overflow: hidden;
  padding: 16px;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  background-color: var(--el-bg-color-page);
  transition: background-color 0.2s;
}

.model-item:hover {
  background-color: var(--el-fill-color-light);
}

.model-item.active {
  background-color: var(--el-color-primary-light-9);
}

.model-info {
  flex: 1;
  margin-right: 16px;
}

.model-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.model-actions {
  display: flex;
  gap: 8px;
}

:deep(.el-tag--small) {
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
}
</style>
