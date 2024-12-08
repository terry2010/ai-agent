const winston = require('winston')
const path = require('path')

// 安全的序列化函数
function safeStringify(obj) {
  const seen = new WeakSet()
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]'
      }
      seen.add(value)
    }
    if (value instanceof Error) {
      return {
        message: value.message,
        stack: value.stack,
        ...value
      }
    }
    return value
  })
}

// 创建 logger 实例
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...rest }) => {
      const extras = Object.keys(rest).length ? safeStringify(rest) : ''
      return `[${timestamp}] ${level}: ${message} ${extras}`
    })
  ),
  transports: [
    // 写入所有日志到 combined.log
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // 写入错误日志到 error.log
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
})

// 在开发环境下同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...rest }) => {
        const extras = Object.keys(rest).length ? safeStringify(rest) : ''
        return `[${timestamp}] ${level}: ${message} ${extras}`
      })
    )
  }))
}

module.exports = logger
