const { spawn } = require('child_process')
const path = require('path')

// 等待一段时间让 Vite 服务器启动
setTimeout(() => {
  const electronPath = process.platform === 'win32' ? 'node_modules/electron/dist/electron.exe' : 'node_modules/.bin/electron'
  const electron = spawn(path.join(process.cwd(), electronPath), [path.join(__dirname, '../src/main/index.js')], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  })

  electron.on('close', () => {
    process.exit()
  })
}, 5000)
