<template>
  <div class="app-container">
    <el-container>
      <!-- 顶部状态栏 -->
      <el-header height="50px">
        <div class="header-left">
          <el-button>设置</el-button>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useChatStore } from './stores/chat'
import ChatMessage from './components/ChatMessage.vue'

const chatStore = useChatStore()
const inputMessage = ref('')
const modelConnected = ref(false)
const selectedModel = ref('codellama')

// 初始化
onMounted(async () => {
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
}

.el-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #dcdfe6;
}

.model-select {
  width: 100%;
  margin: 10px 0;
}

.new-chat-btn {
  width: calc(100% - 20px);
  margin: 10px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.input-area {
  padding: 20px;
  border-top: 1px solid #dcdfe6;
}

.input-buttons {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.el-aside {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #dcdfe6;
}

.el-menu {
  flex: 1;
  overflow-y: auto;
}
</style>
