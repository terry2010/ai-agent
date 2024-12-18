<template>
  <div class="chat-container">
    <!-- 消息列表区域 -->
    <el-scrollbar ref="messageListRef" class="message-list" :class="{ 'smooth-scroll': shouldAutoScroll }" @scroll="onScroll">
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
    </el-scrollbar>

    <!-- 输入区域 -->
    <div class="input-container">
      <div class="input-wrapper">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="3"
          placeholder="输入消息..."
          resize="none"
          :disabled="isLoading"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.shift.enter.exact.prevent="newline"
          class="message-input"
        />
        <div class="button-group">
          <el-upload
            class="upload-button"
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleFileChange"
            accept=".txt,.md,.py,.js,.java,.json,.yaml,.xml,.pdf"
          >
            <el-button :disabled="isLoading">
              <i class="el-icon-upload" /> 上传文件
            </el-button>
          </el-upload>
          <el-button 
            type="primary" 
            @click="sendMessage" 
            :loading="isLoading"
            :disabled="!inputMessage.trim() || isLoading || !currentModel"
            class="send-button"
          >
            发送
          </el-button>
          <el-button @click="clearInput" :disabled="!inputMessage || isLoading">
            清空
          </el-button>
        </div>
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

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--el-bg-color);
  overflow: hidden;
}

.message-list {
  flex: 1;
  padding: 20px;
  box-sizing: border-box;
}

.message-list.smooth-scroll {
  scroll-behavior: smooth;
}

.input-container {
  flex: 0 0 auto;
  padding: 20px;
  background-color: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
  box-sizing: border-box;
  z-index: 1;
}

.input-wrapper {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  max-width: 1200px;
  margin: 0 auto;
}

.message-input {
  flex: 1;
  min-height: 40px;
  max-height: 200px;
  resize: vertical;
}

.send-button {
  height: 40px;
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

.upload-button {
  margin-right: 8px;
}

.upload-button .el-upload {
  width: auto;
}
</style>

<script setup>
import { ref, watch, nextTick, computed, defineExpose } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '../../stores/chatStore'
import { useModelStore } from '../../stores/modelStore'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

// 工具函数：查找数组中最后一个满足条件的元素的索引
const findLastIndex = (array, predicate) => {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i])) {
      return i
    }
  }
  return -1
}

const chatStore = useChatStore()
const modelStore = useModelStore()
const { currentMessages } = storeToRefs(chatStore)
const { currentModel } = storeToRefs(modelStore)
const isLoading = computed(() => modelStore.loading)

// 输入消息
const inputMessage = ref('')
const messageListRef = ref(null)

// 当前正在生成的消息
let responseCleanup = null
let shouldAutoScroll = ref(true)

// 立即定位到底部（不需要检查条件，不使用平滑滚动）
const jumpToBottom = () => {
  const messageList = messageListRef.value
  if (messageList) {
    // 临时禁用平滑滚动
    messageList.$el.style.scrollBehavior = 'auto'
    messageList.setScrollTop(messageList.wrapRef.scrollHeight)
    // 恢复默认行为
    requestAnimationFrame(() => {
      messageList.$el.style.scrollBehavior = ''
    })
  }
}

// 智能滚动到底部（带平滑效果）
const scrollToBottom = async () => {
  await nextTick()
  const messageList = messageListRef.value
  if (!messageList) return

  // 如果在底部或最新用户消息可见，则滚动到底部
  if (isNearBottom() || isLatestUserMessageVisible()) {
    shouldAutoScroll.value = true
    messageList.setScrollTop(messageList.wrapRef.scrollHeight)
  }
}

// 判断是否接近底部
const isNearBottom = () => {
  const messageList = messageListRef.value
  if (!messageList) return false

  const { scrollTop, clientHeight, scrollHeight } = messageList.wrapRef
  return scrollHeight - (scrollTop + clientHeight) <= 100
}

// 判断最新的用户消息是否可见
const isLatestUserMessageVisible = () => {
  const messageList = messageListRef.value
  if (!messageList) return false

  const messages = currentMessages.value
  const lastUserMessageIndex = findLastIndex(messages, m => m.role === 'user')
  if (lastUserMessageIndex === -1) return false

  const messageElements = messageList.$el.querySelectorAll('.message')
  const lastUserMessage = messageElements[lastUserMessageIndex]
  if (!lastUserMessage) return false

  const containerRect = messageList.wrapRef.getBoundingClientRect()
  const messageRect = lastUserMessage.getBoundingClientRect()

  return messageRect.top >= containerRect.top && messageRect.bottom <= containerRect.bottom
}

// 判断最新的助手消息是否可见
const isLatestAssistantMessageVisible = () => {
  const messageList = messageListRef.value
  if (!messageList) return false

  const messages = currentMessages.value
  const lastAssistantMessageIndex = findLastIndex(messages, m => m.role === 'assistant')
  if (lastAssistantMessageIndex === -1) return false

  const messageElements = messageList.$el.querySelectorAll('.message')
  const lastAssistantMessage = messageElements[lastAssistantMessageIndex]
  if (!lastAssistantMessage) return false

  const containerRect = messageList.wrapRef.getBoundingClientRect()
  const messageRect = lastAssistantMessage.getBoundingClientRect()

  // 检查消息底部是否在可视区域内
  return messageRect.bottom <= containerRect.bottom
}

// 监听滚动事件
const onScroll = () => {
  const messageList = messageListRef.value
  if (!messageList) return

  shouldAutoScroll.value = isNearBottom()
}

// 监听消息列表变化
watch(() => currentMessages.value, (newMessages, oldMessages) => {
  nextTick(() => {
    const messageList = messageListRef.value
    if (!messageList) return

    // 如果是新增的助手消息
    if (newMessages?.length > (oldMessages?.length || 0)) {
      const lastMessage = newMessages[newMessages.length - 1]
      if (lastMessage?.role === 'assistant') {
        // 只有当助手最新消息底部可见时，才自动滚动
        if (isLatestAssistantMessageVisible()) {
          messageList.setScrollTop(messageList.wrapRef.scrollHeight)
        }
        return
      }
    }

    // 对于其他情况（如用户消息、切换会话等），保持原有逻辑
    messageList.setScrollTop(messageList.wrapRef.scrollHeight)
  })
}, { immediate: true, deep: true })

// 监听响应更新
watch(() => responseCleanup, (newVal) => {
  if (newVal) {
    // 新的响应处理器被创建时，记录当前状态
    shouldAutoScroll.value = isNearBottom() || isLatestUserMessageVisible()
  }
}, { immediate: true })

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
    // 发送消息时一定滚动到底部
    const messageList = messageListRef.value
    if (messageList) {
      messageList.setScrollTop(messageList.wrapRef.scrollHeight)
    }
    
    // 创建助手消息
    const assistantMessage = await chatStore.addMessage('', 'assistant')
    
    // 设置响应处理器
    responseCleanup = window.api.onResponseChunk(({ chunk, done }) => {
      if (chunk) {
        chatStore.updateMessageContent(assistantMessage.id, chunk)
        // 根据之前的状态决定是否滚动
        if (shouldAutoScroll.value) {
          scrollToBottom()
        }
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

// 文件处理相关
const handleFileChange = async (uploadFile) => {
  if (!uploadFile) return
  
  const file = uploadFile.raw // 获取原始文件对象
  if (!file) return

  // 文件大小限制（10MB）
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    ElMessage.error('文件大小不能超过10MB')
    return
  }

  try {
    const content = await readFileContent(file)
    // 将文件内容添加到输入框
    inputMessage.value = `文件名：${file.name}\n内容：\n${content}`
  } catch (error) {
    ElMessage.error('读取文件失败：' + error.message)
  }
}

// 读取文件内容
const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      resolve(e.target.result)
    }
    
    reader.onerror = (error) => {
      reject(error)
    }

    if (file.type === 'application/pdf') {
      ElMessage.warning('PDF文件支持将在后续版本添加')
      reject(new Error('暂不支持PDF文件'))
      return
    }

    reader.readAsText(file)
  })
}

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

// 暴露方法给父组件
defineExpose({
  jumpToBottom
})
</script>
