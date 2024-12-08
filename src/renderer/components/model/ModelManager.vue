<template>
  <div class="model-manager">
    <div class="model-header">
      <h3>模型管理</h3>
      <el-button 
        type="primary" 
        size="small" 
        @click="refreshModels"
        :loading="loading"
        :disabled="false">
        刷新
      </el-button>
    </div>

    <div class="model-list">
      <el-scrollbar>
        <template v-if="models.length">
          <div v-for="model in models" 
               :key="model.name" 
               class="model-item"
               :class="{ active: model.name === currentModel }">
            <div class="model-info">
              <div class="model-name">
                {{ model.name }}
              </div>
              <div class="model-description">{{ model.details || '无描述' }}</div>
            </div>

            <div class="model-actions">
              <el-button 
                type="primary" 
                size="small" 
                text
                @click="selectModel(model.name)"
                :disabled="loading || model.name === currentModel">
                使用
              </el-button>
              <el-popconfirm
                title="确定要删除这个模型吗？"
                @confirm="deleteModel(model.name)">
                <template #reference>
                  <el-button 
                    type="danger" 
                    size="small" 
                    text
                    :disabled="loading">
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="no-models">
            <p>暂无可用模型</p>
            <el-button type="primary" size="small" @click="refreshModels">刷新</el-button>
          </div>
        </template>
      </el-scrollbar>
    </div>

    <el-dialog
      v-model="showError"
      title="错误"
      width="30%">
      <p>{{ error }}</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showError = false">关闭</el-button>
          <el-button type="primary" @click="handleRetry">重试</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useModelStore } from '@/stores/modelStore'

const modelStore = useModelStore()
const { models, currentModel, loading, error } = storeToRefs(modelStore)
const showError = ref(false)

// 选择模型
const selectModel = async (modelName) => {
  try {
    await modelStore.setCurrentModel(modelName)
  } catch (err) {
    showError.value = true
  }
}

// 删除模型
const deleteModel = async (modelName) => {
  try {
    await modelStore.deleteModel(modelName)
  } catch (err) {
    showError.value = true
  }
}

// 刷新模型列表
const refreshModels = async () => {
  try {
    await modelStore.fetchModels()
  } catch (err) {
    showError.value = true
  }
}

// 重试操作
const handleRetry = () => {
  showError.value = false
  refreshModels()
}

// 监听错误状态
watch(() => error.value, (newError) => {
  if (newError) {
    showError.value = true
  }
})

// 组件挂载时获取模型列表
onMounted(() => {
  refreshModels()
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
  border-bottom: 1px solid var(--el-border-color);
}

.model-header h3 {
  margin: 0;
}

.model-list {
  flex: 1;
  overflow: hidden;
}

.model-item {
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-item.active {
  background-color: var(--el-color-primary-light-9);
}

.model-info {
  flex: 1;
  margin-right: 16px;
}

.model-name {
  font-weight: bold;
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

.no-models {
  padding: 32px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
