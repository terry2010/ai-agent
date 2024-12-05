<template>
  <div class="app-container">
    <el-container>
      <!-- 顶部状态栏 -->
      <el-header height="50px">
        <div class="header-left">
          <el-button @click="showSettings = true">设置</el-button>
        </div>
        <div class="header-right">
          <span class="model-status">
            模型状态
            <el-tag :type="modelConnected ? 'success' : 'danger'" size="small">
              {{ modelConnected ? '已连接' : '未连接' }}
            </el-tag>
          </span>
        </div>
      </el-header>

      <el-container>
        <!-- 侧边栏 -->
        <el-aside width="200px">
          <el-select v-model="selectedModel" placeholder="选择模型" class="model-select">
            <el-option label="CodeLlama" value="codellama" />
            <el-option label="Llama2" value="llama2" />
          </el-select>
          
          <el-menu 
            :default-active="String(chatStore.currentConversationId)" 
            @select="handleConversationSelect"
          >
            <el-menu-item 
              v-for="chat in chatStore.conversations" 
              :key="chat.id" 
              :index="String(chat.id)"
            >
              {{ chat.title }}
            </el-menu-item>
          </el-menu>
          
          <el-button 
            type="primary" 
            plain 
            class="new-chat-btn" 
            @click="createNewChat"
          >
            新建对话
          </el-button>
        </el-aside>

        <!-- 主对话区域 -->
        <el-main>
          <div class="chat-messages">
            <ChatMessage
              v-for="msg in chatStore.messages"
              :key="msg.id"
              :content="msg.content"
              :is-ai="msg.isAI"
              :timestamp="msg.timestamp"
            />
          </div>
          
          <div class="input-area">
            <el-input
              v-model="inputMessage"
              type="textarea"
              :rows="3"
              placeholder="输入消息，按Enter发送，Shift+Enter换行"
              @keydown="newline"
            />
            <div class="input-buttons">
              <el-button @click="clearInput">清空</el-button>
              <el-button type="primary" @click="sendMessage">发送</el-button>
            </div>
          </div>
        </el-main>
      </el-container>
    </el-container>
    
    <!-- 设置对话框 -->
    <SettingsDialog
      v-model:visible="showSettings"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useChatStore } from './stores/chat'
import { useSettingsStore } from './stores/settings'
import ChatMessage from './components/ChatMessage.vue'
import SettingsDialog from './components/SettingsDialog.vue'

const chatStore = useChatStore()
const settingsStore = useSettingsStore()
const inputMessage = ref('')
const modelConnected = ref(false)
const selectedModel = ref('codellama')
const showSettings = ref(false)

// 初始化
onMounted(async () => {
  // 加载设置
  const settings = settingsStore.getSettings()
  if (settings) {
    selectedModel.value = settings.defaultModel
    settingsStore.applySettings(settings)
  }
  
  // 检查模型状态
  modelConnected.value = await chatStore.checkModelStatus()
  if (!chatStore.currentConversationId) {
    chatStore.createNewConversation()
  }
})

// 发送消息
async function sendMessage() {
  if (!inputMessage.value.trim()) return
  
  const message = inputMessage.value
  inputMessage.value = ''
  
  await chatStore.sendMessage(message)
}

// 创建新对话
function createNewChat() {
  chatStore.createNewConversation()
}

// 选择对话
function handleConversationSelect(id) {
  chatStore.loadConversation(Number(id))
}

// 换行处理
function newline(e) {
  if (e.shiftKey && e.key === 'Enter') {
    e.preventDefault()
    inputMessage.value += '\n'
  } else if (e.key === 'Enter') {
    e.preventDefault()
    sendMessage()
  }
}

// 清空输入
function clearInput() {
  inputMessage.value = ''
}
</script>

<style>
.app-container {
  height: 100vh;
  background-color: #f5f7fa;
}

.el-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #dcdfe6;
  background-color: #fff;
  padding: 0 20px;
}

.el-aside {
  background-color: #fff;
  border-right: 1px solid #dcdfe6;
  padding: 20px;
}

.model-select {
  width: 100%;
  margin: 10px 0;
}

.new-chat-btn {
  width: 100%;
  margin-top: 20px;
}

.chat-messages {
  height: calc(100vh - 250px);
  overflow-y: auto;
  padding: 20px;
}

.input-area {
  position: fixed;
  bottom: 0;
  left: 200px;
  right: 0;
  padding: 20px;
  background-color: #fff;
  border-top: 1px solid #dcdfe6;
}

.input-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
  gap: 10px;
}

.el-main {
  padding: 0;
  position: relative;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.model-status {
  display: flex;
  align-items: center;
  gap: 5px;
}

:deep(.el-menu) {
  border-right: none;
  margin-top: 20px;
}

:deep(.el-menu-item) {
  border-radius: 4px;
  margin: 5px 0;
}

:deep(.el-menu-item.is-active) {
  background-color: #ecf5ff;
}
</style>
