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
              <div class="sidebar-header">
                <el-button type="primary" class="w-100" @click="createNewChat">新建会话</el-button>
              </div>
              <el-scrollbar>
                <el-menu
                  :default-active="chatStore.currentConversationId"
                  class="chat-list"
                  @select="selectConversation"
                >
                  <el-menu-item
                    v-for="chat in chatStore.conversations"
                    :key="chat.id"
                    :index="chat.id"
                    class="chat-item"
                  >
                    <div class="chat-item-content">
                      <span class="chat-title">{{ chat.title || '新会话' }}</span>
                      <el-button
                        class="delete-btn"
                        type="danger"
                        link
                        @click.stop="confirmDelete(chat)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </div>
                  </el-menu-item>
                </el-menu>
              </el-scrollbar>
            </div>
          </el-tab-pane>
          
          <el-tab-pane label="模型" name="model">
            <ModelManager />
          </el-tab-pane>
        </el-tabs>
      </el-aside>

      <!-- 主要内容区域 -->
      <el-main class="main-content">
        <chat-view ref="chatViewRef" />
      </el-main>
    </el-container>

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
import { ref, onMounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useModelStore } from '../../stores/modelStore'
import { useChatStore } from '../../stores/chatStore'
import ModelManager from '../../components/model/ModelManager.vue'
import ChatView from '../../components/chat/ChatView.vue'
import { ElMessageBox } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import { Delete } from '@element-plus/icons-vue'

// 初始化 stores
const modelStore = useModelStore()
const chatStore = useChatStore()

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

// 确认删除对话
const confirmDelete = async (chat) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个会话吗？此操作不可恢复。',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        icon: Warning
      }
    )
    await chatStore.deleteConversation(chat.id)
  } catch {
    // 用户取消删除
  }
}

// 创建新会话
const createNewChat = async () => {
  await chatStore.createConversation()
}

// 选择对话
const selectConversation = async (chatId) => {
  await chatStore.selectConversation(chatId)
  // 切换会话后立即跳转到底部
  nextTick(() => {
    chatViewRef.value?.jumpToBottom()
  })
}

const chatViewRef = ref(null)
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

.sidebar-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.sidebar-header .el-button {
  width: 100%;
}

.chat-list {
  height: 100%;
  overflow: auto;
  padding: 0 8px;
}

.chat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin: 4px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.chat-item:hover {
  background-color: var(--el-fill-color-light);
}

.chat-item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
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

.chat-item:hover .delete-btn {
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
</style>
