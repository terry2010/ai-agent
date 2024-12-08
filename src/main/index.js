const electron = require('electron')
const { app, BrowserWindow } = electron
const path = require('path')
const { setupIPC } = require('./ipc')
const logger = require('./logger')

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  logger.info('Creating main window')
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
    logger.debug('Started in development mode')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    logger.info('Started in production mode')
  }
}

app.whenReady().then(() => {
  logger.info('Application ready, initializing...')
  createWindow()
  setupIPC()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      logger.info('No windows found, creating new window')
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  logger.info('All windows closed')
  if (process.platform !== 'darwin') {
    logger.info('Quitting application')
    app.quit()
  }
})
