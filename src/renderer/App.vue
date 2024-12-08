<template>
  <main-layout>
    <chat-view />
  </main-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useChatStore } from './stores/chat'
import { useSettingsStore } from './stores/settings'
import { useModelStore } from './stores/modelStore'
import MainLayout from './components/layout/MainLayout.vue'
import ChatView from './components/chat/ChatView.vue'

const chatStore = useChatStore()
const settingsStore = useSettingsStore()
const modelStore = useModelStore()
const inputMessage = ref('')
const modelConnected = ref(false)
const selectedModel = ref('codellama')
const showSettings = ref(false)

// 初始化
onMounted(async () => {
  console.log('=== App: Component mounted ===')
  
  // 加载设置
  const settings = settingsStore.getSettings()
  if (settings) {
    selectedModel.value = settings.defaultModel
    settingsStore.applySettings(settings)
  }
  
  // 初始化模型
  await modelStore.fetchModels()
  
  // 检查模型状态
  modelConnected.value = await chatStore.checkModelStatus()
  if (!chatStore.currentConversationId) {
    chatStore.createConversation()
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
  chatStore.createConversation()
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
body {
  margin: 0;
  font-family: var(--el-font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100vh;
}
</style>
