import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/theme.css'
import App from './App.vue'

const app = createApp(App)

// 使用插件
app.use(ElementPlus)
app.use(createPinia())

app.mount('#app')
