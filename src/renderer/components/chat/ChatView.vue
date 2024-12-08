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
              <div class="message-footer">
                <div class="message-time">{{ formatTime(message.timestamp) }}</div>
                <div class="message-actions">
                  <el-tooltip content="复制消息" placement="top" :hide-after="1000">
                    <el-button type="text" @click="copyMessage(message)">
                      <i class="el-icon-document-copy" />
                    </el-button>
                  </el-tooltip>
                  <el-tooltip v-if="message.role === 'user'" content="重新发送" placement="top" :hide-after="1000">
                    <el-button type="text" @click="resendMessage(message)">
                      <i class="el-icon-refresh" />
                    </el-button>
                  </el-tooltip>
                </div>
              </div>
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
import { ElMessage } from 'element-plus'

// 初始化stores
const chatStore = useChatStore()
const modelStore = useModelStore()

console.log('ChatView setup - chatStore:', chatStore)
console.log('ChatView setup - store methods:', Object.keys(chatStore))

// 使用 storeToRefs 来保持响应性
const { conversations, currentMessages, isLoading, error } = storeToRefs(chatStore)
const { currentConversation } = storeToRefs(chatStore)

// Markdown渲染配置
const md = new MarkdownIt({
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        return `<pre><code class="hljs language-${lang}">${highlighted}</code><button class="copy-button el-button el-button--text" onclick="navigator.clipboard.writeText(\`${str.replace(/`/g, '\\`')}\`).then(() => { const el = document.createElement('span'); el.textContent = '已复制'; el.style.position = 'absolute'; el.style.right = '8px'; el.style.top = '8px'; this.replaceWith(el); setTimeout(() => el.remove(), 1000); })"><i class="el-icon-document-copy"></i></button></pre>`
      } catch (__) {}
    }
    return '<pre><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>'
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

// 复制消息内容
const copyMessage = (message) => {
  navigator.clipboard.writeText(message.content).then(() => {
    ElMessage.success('消息已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

// 重新发送消息
const resendMessage = async (message) => {
  inputMessage.value = message.content
  await sendMessage()
}

// 组件挂载后初始化
onMounted(async () => {
  try {
    // 先加载本地存储的会话
    await chatStore.loadFromLocalStorage()
    
    // 只有在没有任何会话时才创建新会话
    if (conversations.value.length === 0) {
      await chatStore.createConversation()
    }
  } catch (err) {
    console.error('初始化失败:', err)
  }
})

// 监听消息变化，自动滚动到底部
watch(currentMessages, () => {
  nextTick(() => {
    scrollToBottom()
  })
}, { deep: true })
</script>

<style scoped>
.chat-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.message-list {
  flex: 1;
  overflow: hidden;
  padding: 20px;
}

.message-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

.message {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

.message.assistant {
  align-items: flex-start;
}

.message.user {
  align-items: flex-end;
}

.message-content {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: var(--el-color-primary-light-9);
}

.message.assistant .message-content {
  background-color: var(--el-bg-color-page);
}

.message-text {
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.message-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message:hover .message-actions {
  opacity: 1;
}

.input-area {
  padding: 20px;
  border-top: 1px solid var(--el-border-color);
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
  z-index: 1000;
}

:deep(.el-button--text) {
  padding: 2px 4px;
}

:deep(pre) {
  position: relative;
}

:deep(pre .copy-button) {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

:deep(pre:hover .copy-button) {
  opacity: 1;
}

:deep(blockquote) {
  margin: 16px 0;
  padding: 0 16px;
  color: var(--el-text-color-regular);
  border-left: 4px solid var(--el-border-color);
  color: var(--el-text-color-secondary);
}
</style>
