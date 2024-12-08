<template>
  <div class="chat-container">
    <!-- 消息列表区域 -->
    <div class="message-list" ref="messageListRef">
      <template v-for="message in currentMessages" :key="message.id">
        <div v-if="message.content && message.content.trim()" class="message" :class="message.role">
          <div class="message-content" v-html="renderMarkdown(message.content || '')"></div>
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
      </template>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <div class="model-selector">
        <el-select
          v-model="currentModel"
          placeholder="选择模型"
          :loading="modelStore.loading"
          :disabled="isLoading"
          style="width: 200px">
          <el-option
            v-for="model in modelStore.models"
            :key="model.name"
            :label="model.name + ' (' + formatSize(model.size) + ')'"
            :value="model.name">
            <span>{{ model.name }}</span>
            <span class="model-size">{{ formatSize(model.size) }}</span>
          </el-option>
        </el-select>
      </div>
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
          :disabled="!inputMessage.trim() || isLoading || !currentModel">
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
import { ref, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chatStore'
import { useModelStore } from '@/stores/modelStore'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

const chatStore = useChatStore()
const modelStore = useModelStore()

// 使用 storeToRefs 来保持响应性
const { currentMessages, isLoading, error: chatError } = storeToRefs(chatStore)
const { currentModel, error: modelError, isConnected } = storeToRefs(modelStore)

// 当前正在生成的消息
let responseCleanup = null

// 监听消息内容变化，自动滚动到底部
watch(() => currentMessages.value?.length, () => {
  scrollToBottom()
}, { deep: true })

// 配置 marked
marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (err) {
        console.error('Failed to highlight code:', err)
      }
    }
    return code
  },
  breaks: true,
  gfm: true
})

// 渲染 Markdown
const renderMarkdown = (content) => {
  if (!content) return ''
  try {
    return marked(content)
  } catch (err) {
    console.error('Failed to render markdown:', err)
    return content
  }
}

// 格式化文件大小
const formatSize = (bytes) => {
  if (!bytes) return '未知'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
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
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

// 重新发送消息
const resendMessage = async (message) => {
  inputMessage.value = message.content
  await sendMessage()
}

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return
  
  try {
    if (!currentModel.value) {
      throw new Error('请先选择一个模型')
    }

    // 清理之前的响应处理器
    if (responseCleanup) {
      responseCleanup()
      responseCleanup = null
    }

    // 创建用户消息
    const userMessage = await chatStore.addMessage(inputMessage.value.trim(), 'user')
    clearInput()
    
    // 创建助手消息
    const assistantMessage = await chatStore.addMessage('', 'assistant')
    
    // 设置响应处理器
    responseCleanup = window.api.onResponseChunk(({ chunk, done }) => {
      if (chunk) {
        chatStore.updateMessageContent(assistantMessage.id, chunk)
      }
      if (done) {
        responseCleanup()
        responseCleanup = null
      }
    })

    // 发送消息到模型
    await window.api.sendMessage(userMessage.content, currentModel.value)
  } catch (error) {
    console.error('Failed to send message:', error)
    ElMessage.error(error.message)
  }
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
const scrollToBottom = async () => {
  await nextTick()
  const messageList = messageListRef.value
  if (messageList) {
    messageList.scrollTop = messageList.scrollHeight
  }
}

// 输入消息
const inputMessage = ref('')
const messageListRef = ref(null)

// 监听错误状态
watch([chatError, modelError], ([newChatError, newModelError]) => {
  if (newChatError) {
    ElMessage.error(newChatError)
  }
  if (newModelError) {
    ElMessage.error(newModelError)
  }
})

// 在组件卸载时清理
onUnmounted(() => {
  if (responseCleanup) {
    responseCleanup()
    responseCleanup = null
  }
})

// 在组件挂载时初始化
onMounted(async () => {
  console.log('ChatView mounted')
  try {
    // 获取模型列表
    console.log('Fetching models...')
    await modelStore.fetchModels()
    console.log('Models fetched:', modelStore.models)
  } catch (err) {
    console.error('Failed to initialize chat view:', err)
    ElMessage.error(err.message)
  }
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  background: #f7f8fa;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  margin-bottom: 20px;
}

.message {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
}

.message.user {
  align-items: flex-end;
}

.message.assistant {
  align-items: flex-start;
}

.message-content {
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 12px;
  background-color: #f0f2f5;
  word-wrap: break-word;
  overflow-wrap: break-word;
  position: relative;
  margin-bottom: 4px;
}

.message.user .message-content {
  background-color: #1890ff;
  color: white;
}

.message.assistant .message-content {
  background-color: #f0f2f5;
  color: #000;
}

.message-footer {
  font-size: 12px;
  color: #8c8c8c;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 0 4px;
}

.message.user .message-footer {
  justify-content: flex-end;
}

.message.assistant .message-footer {
  justify-content: flex-start;
}

.message-time {
  color: #8c8c8c;
  font-size: 12px;
  line-height: 1;
}

.message-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message:hover .message-actions {
  opacity: 1;
}

.input-area {
  margin-top: auto;
  padding: 20px;
  background: white;
  border-top: 1px solid #e8e8e8;
  border-radius: 8px;
}

.model-selector {
  margin-bottom: 12px;
}

:deep(.markdown-body) {
  background-color: transparent !important;
  margin: 0;
  padding: 0;
}

:deep(.markdown-body pre) {
  background-color: #282c34;
  margin: 8px 0;
  border-radius: 6px;
}

:deep(.el-textarea__inner) {
  resize: none !important;
  border-radius: 8px;
}

.error-alert {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}

.model-size {
  float: right;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

:deep(.el-select-dropdown__item) {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
