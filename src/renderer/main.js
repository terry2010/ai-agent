import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/theme.css'
import App from './App.vue'
import { useChatStore } from './stores/chatStore'
import { useModelStore } from './stores/modelStore'

// 创建应用实例和 Pinia
const app = createApp(App)
const pinia = createPinia()

// 使用插件
app.use(pinia)
app.use(ElementPlus)

// 初始化 stores
const chatStore = useChatStore()
const modelStore = useModelStore()

// 确保 store 已经准备好
Promise.all([
  // 在这里添加任何需要的 store 初始化
  chatStore.loadFromLocalStorage(),
  chatStore.checkModelStatus()
]).then(() => {
  // 挂载应用
  app.mount('#app')
}).catch(error => {
  console.error('Store initialization failed:', error)
  // 仍然挂载应用，但是可能需要显示错误状态
  app.mount('#app')
})
