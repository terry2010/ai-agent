<template>
  <el-container class="layout-container">
    <!-- 顶部状态栏 -->
    <el-header height="48px" class="header">
      <div class="left">
        <el-button text>设置</el-button>
      </div>
      <div class="right">
        <el-tag :type="modelStore.isConnected ? 'success' : 'danger'" size="small">
          {{ modelStore.isConnected ? '模型已连接' : '模型未连接' }}
        </el-tag>
      </div>
    </el-header>

    <el-container class="main-container">
      <!-- 左侧边栏 -->
      <el-aside width="240px" class="sidebar">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="聊天" name="chat">
            <el-select 
              v-model="modelStore.currentModel" 
              placeholder="选择模型" 
              class="model-select"
              :loading="modelStore.loading"
              @change="handleModelChange">
              <el-option 
                v-for="model in modelStore.models" 
                :key="model.name" 
                :label="model.name" 
                :value="model.name">
                <span>{{ model.name }}</span>
                <span class="model-size">{{ formatSize(model.size) }}</span>
              </el-option>
            </el-select>
            
            <div class="history-list">
              <div class="history-header">
                <span class="history-title">历史记录</span>
                <el-button 
                  type="primary" 
                  size="small" 
                  text 
                  @click="createNewChat">
                  新对话
                </el-button>
              </div>
              
              <el-scrollbar>
                <div v-for="chat in chatStore.conversations" 
                     :key="chat.id" 
                     class="history-item"
                     :class="{ active: chatStore.currentConversationId === chat.id }"
                     @click="selectConversation(chat.id)">
                  <span class="chat-title">{{ chat.title }}</span>
                  <el-button 
                    type="danger" 
                    size="small" 
                    text 
                    class="delete-btn"
                    @click.stop="confirmDelete(chat)">
                    删除
                  </el-button>
                </div>
              </el-scrollbar>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="模型" name="model">
            <ModelManager />
          </el-tab-pane>
        </el-tabs>
      </el-aside>

      <!-- 主内容区 -->
      <el-main class="main-content">
        <slot></slot>
      </el-main>
    </el-container>

    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="showDeleteConfirm"
      title="确认删除"
      width="360px"
      class="delete-dialog"
      :modal-class="'delete-dialog-modal'"
      :close-on-click-modal="false"
      align-center>
      <div class="delete-dialog-content">
        <el-icon class="warning-icon"><Warning /></el-icon>
        <span>确定要删除对话 "{{ chatToDelete?.title }}" 吗？</span>
        <div class="delete-warning">此操作不可恢复</div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button plain @click="showDeleteConfirm = false">取消</el-button>
          <el-button type="danger" @click="deleteChat">
            确定删除
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 错误提示 -->
    <el-alert
      v-if="modelStore.error"
      :title="modelStore.error"
      type="error"
      :closable="true"
      show-icon
      class="error-alert"
    />
  </el-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useModelStore } from '../../stores/modelStore'
import { useChatStore } from '../../stores/chatStore'
import ModelManager from '../../components/model/ModelManager.vue'
import { ElMessageBox } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'

// 初始化 stores
const modelStore = useModelStore()
const chatStore = useChatStore()

// 删除对话相关
const showDeleteConfirm = ref(false)
const chatToDelete = ref(null)

// 标签页相关
const activeTab = ref('chat')

// 格式化文件大小
const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

// 处理模型切换
const handleModelChange = async (modelName) => {
  if (modelName) {
    await modelStore.setCurrentModel(modelName)
  }
}

// 初始化
onMounted(async () => {
  await modelStore.fetchModels()
})

// 创建新对话
const createNewChat = () => {
  chatStore.createConversation()
}

// 选择对话
const selectConversation = (chatId) => {
  chatStore.selectConversation(chatId)
}

// 确认删除对话
const confirmDelete = (chat) => {
  chatToDelete.value = chat
  showDeleteConfirm.value = true
}

// 删除对话
const deleteChat = () => {
  if (chatToDelete.value) {
    chatStore.deleteConversation(chatToDelete.value.id)
    showDeleteConfirm.value = false
    chatToDelete.value = null
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  flex: 0 0 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-bg-color);
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  flex: 0 0 240px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-bg-color-page);
  overflow: hidden;
}

:deep(.el-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
  padding: 16px;
}

:deep(.el-tab-pane) {
  height: 100%;
}

.model-select {
  width: 100%;
  margin-bottom: 16px;
}

.history-list {
  height: calc(100% - 56px);
  display: flex;
  flex-direction: column;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 8px;
}

.history-title {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin: 4px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background-color: var(--el-fill-color-light);
}

.history-item.active {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.chat-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.history-item:hover .delete-btn {
  opacity: 1;
}

.main-content {
  padding: 0;
  background-color: var(--el-bg-color);
}

.error-alert {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
}

:deep(.el-select-dropdown__item) {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
}

:deep(.el-select-dropdown__item small) {
  font-size: 12px;
  margin-top: 2px;
}

/* 删除确认对话框样式 */
:deep(.delete-dialog) {
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

:deep(.delete-dialog .el-dialog__header) {
  margin: 0;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: white;
}

:deep(.delete-dialog .el-dialog__body) {
  background: white;
  padding: 0;
}

:deep(.delete-dialog .el-dialog__headerbtn) {
  top: 16px;
}

.delete-dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 20px;
  text-align: center;
  background: white;
}

.warning-icon {
  font-size: 24px;
  color: var(--el-color-danger);
  margin-bottom: 16px;
}

.delete-warning {
  margin-top: 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

:deep(.delete-dialog .el-dialog__footer) {
  padding: 16px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  margin: 0;
  background: white;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.delete-dialog-modal) {
  background-color: rgba(0, 0, 0, 0.65);
}

:deep(.dialog-footer .el-button--plain) {
  border-color: var(--el-border-color-lighter);
  color: var(--el-text-color-regular);
}

:deep(.dialog-footer .el-button--danger) {
  border: none;
  padding: 8px 16px;
}
</style>
