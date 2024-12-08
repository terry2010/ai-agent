<template>
  <div class="chat-container">
    <!-- 消息列表区域 -->
    <div class="message-list" ref="messageListRef">
      <el-scrollbar>
        <div class="message-wrapper">
          <div v-for="message in currentMessages" 
               :key="message.id" 
               class="message"
               :class="message.role">
            <div class="message-content">
              <div class="message-text" v-html="renderMarkdown(message.content)"></div>
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <el-input
        v-model="inputMessage"
        type="textarea"
        :rows="3"
        placeholder="输入消息..."
        resize="none"
        :disabled="isLoading"
        @keydown.enter.exact.prevent="sendMessage"
        @keydown.shift.enter.exact.prevent="newline"
      />
      <div class="button-group">
        <el-button 
          type="primary" 
          @click="sendMessage" 
          :loading="isLoading"
          :disabled="!inputMessage.trim() || isLoading">
          发送
        </el-button>
        <el-button @click="clearInput" :disabled="!inputMessage || isLoading">
          清空
        </el-button>
      </div>
    </div>

    <!-- 错误提示 -->
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="true"
      show-icon
      class="error-alert"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chatStore'
import { useModelStore } from '@/stores/modelStore'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

// 初始化stores
const chatStore = useChatStore()
const modelStore = useModelStore()

// 使用 storeToRefs 来保持响应性
const { currentMessages, isLoading, error } = storeToRefs(chatStore)

// 初始化 markdown-it
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch (__) {}
    }
    return '' // 使用默认的转义
  }
})

// 输入消息
const inputMessage = ref('')
const messageListRef = ref(null)

// 渲染 Markdown
const renderMarkdown = (content) => {
  return md.render(content)
}

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return
  
  // 检查模型连接状态
  if (!modelStore.isConnected) {
    error.value = '模型未连接，请检查模型状态'
    return
  }

  const message = inputMessage.value
  inputMessage.value = ''

  await chatStore.addMessage(message)
  await nextTick()
  scrollToBottom()
}

// 清空输入
const clearInput = () => {
  inputMessage.value = ''
}

// 换行
const newline = () => {
  inputMessage.value += '\n'
}

// 滚动到底部
const scrollToBottom = () => {
  if (messageListRef.value) {
    const scrollbar = messageListRef.value.querySelector('.el-scrollbar__wrap')
    if (scrollbar) {
      scrollbar.scrollTop = scrollbar.scrollHeight
    }
  }
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

// 监听消息变化，自动滚动到底部
watch(() => currentMessages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })

// 组件挂载后初始化
onMounted(async () => {
  try {
    // 加载历史记录
    await chatStore.loadFromLocalStorage()
    
    // 检查模型状态
    await modelStore.checkConnection()
    
    // 如果没有当前对话，创建新对话
    if (!chatStore.currentConversation) {
      chatStore.createConversation()
    }
  } catch (err) {
    console.error('初始化失败:', err)
  }
})
</script>

<style>
.chat-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.message-list {
  flex: 1;
  overflow: hidden;
  padding: 20px;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  margin-bottom: 8px;
}

.message.assistant {
  justify-content: flex-start;
}

.message.user {
  justify-content: flex-end;
}

.message-content {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: var(--el-bg-color-page);
}

.message.assistant .message-content {
  background-color: var(--el-color-primary-light-9);
}

.message.user .message-content {
  background-color: var(--el-color-success-light-9);
}

.message-text {
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  text-align: right;
}

.input-area {
  padding: 16px;
  border-top: 1px solid var(--el-border-color-light);
  background-color: var(--el-bg-color);
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.error-alert {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
}

/* Markdown 样式 */
.message-text :deep(pre) {
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  padding: 12px;
  margin: 8px 0;
  overflow-x: auto;
}

.message-text :deep(code) {
  font-family: Monaco, Consolas, Courier New, monospace;
  padding: 2px 4px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 2px;
}

.message-text :deep(pre code) {
  padding: 0;
  background-color: transparent;
}

.message-text :deep(p) {
  margin: 8px 0;
}

.message-text :deep(ul), .message-text :deep(ol) {
  padding-left: 20px;
  margin: 8px 0;
}

.message-text :deep(blockquote) {
  margin: 8px 0;
  padding-left: 12px;
  border-left: 4px solid var(--el-border-color);
  color: var(--el-text-color-secondary);
}
</style>
