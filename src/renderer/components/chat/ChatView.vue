<template>
  <div class="chat-container">
    <!-- 消息列表区域 -->
    <div class="message-list" ref="messageListRef">
      <template v-for="message in currentMessages" :key="message.id">
        <div class="message" :class="message.role">
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
const currentGeneratingMessage = ref(null)

// 监听消息内容变化，自动滚动到底部
watch(() => currentMessages.value?.length, () => {
  scrollToBottom()
}, { deep: true })

watch(() => currentGeneratingMessage.value?.content, () => {
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
  if (!inputMessage.value.trim()) return
  
  try {
    if (!isConnected.value) {
      throw new Error('Ollama 服务未连接')
    }
    
    if (!currentModel.value) {
      throw new Error('请先选择一个模型')
    }
    
    // 创建用户消息
    await chatStore.addMessage(inputMessage.value, 'user')
    inputMessage.value = ''
    
    // 创建助手消息
    const assistantMessage = await chatStore.addMessage('', 'assistant')
    currentGeneratingMessage.value = assistantMessage
    
    await scrollToBottom()
  } catch (err) {
    ElMessage.error(err.message)
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

// 在组件挂载时初始化
onMounted(async () => {
  console.log('ChatView mounted')
  try {
    // 获取模型列表
    console.log('Fetching models...')
    await modelStore.fetchModels()
    console.log('Models fetched:', modelStore.models)
    
    // 设置响应流事件监听
    const cleanup = window.api.onResponseChunk(({ chunk, done }) => {
      console.log('Response chunk received:', { chunk, done })
      if (currentGeneratingMessage.value) {
        currentGeneratingMessage.value.content += chunk
        if (done) {
          currentGeneratingMessage.value = null
          chatStore.saveToLocalStorage() // 保存完整的对话
        }
      }
    })
    
    // 组件卸载时清理事件监听器
    onUnmounted(() => {
      cleanup()
    })
  } catch (err) {
    console.error('Failed to initialize chat view:', err)
    ElMessage.error(err.message)
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
  background-color: var(--el-bg-color);
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

.input-area {
  border-top: 1px solid var(--el-border-color);
  padding: 20px;
  background-color: var(--el-bg-color-overlay);
}

.model-selector {
  margin-bottom: 10px;
}

.button-group {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.message {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
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
  border-radius: 8px;
  background-color: var(--el-color-primary-light-9);
}

.message.user .message-content {
  background-color: var(--el-color-primary);
  color: white;
}

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.message-footer {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.message.user .message-footer {
  color: var(--el-color-white);
}

.message-actions {
  display: flex;
  gap: 8px;
}

.message.user .message-actions :deep(.el-button) {
  color: var(--el-color-white);
}

:deep(.markdown-body) {
  background-color: transparent !important;
}

:deep(.el-textarea__inner) {
  resize: none !important;
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
