import VMdEditor from '@kangc/v-md-editor'
import '@kangc/v-md-editor/lib/style/base-editor.css'
import githubTheme from '@kangc/v-md-editor/lib/theme/github.js'
import '@kangc/v-md-editor/lib/theme/style/github.css'
import hljs from 'highlight.js'

// 配置Markdown编辑器
export function setupMarkdown(app) {
  VMdEditor.use(githubTheme, {
    Hljs: hljs,
  })
  
  app.use(VMdEditor)
}
