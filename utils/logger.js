const winston = require('winston')
const path = require('path')
const fs = require('fs')

const { combine, timestamp, printf, colorize } = winston.format

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
  return `${timestamp} [${level}]: ${message}${metaStr}`
})

// Determine if we're in a serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.FUNCTION_NAME

// Configure transports based on environment
const transports = [
  new winston.transports.Console({ format: combine(colorize(), timestamp(), logFormat) })
]

// Only add file transports if not in serverless environment
if (!isServerless) {
  const logsDir = path.resolve(process.cwd(), 'logs')
  if (!fs.existsSync(logsDir)) {
    try {
      fs.mkdirSync(logsDir, { recursive: true })
    } catch (err) {
      console.warn('Unable to create logs directory:', err.message)
    }
  }
  
  if (fs.existsSync(logsDir)) {
    transports.push(
      new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
      new winston.transports.File({ filename: path.join(logsDir, 'combined.log') })
    )
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(timestamp(), logFormat),
  transports,
  exceptionHandlers: isServerless 
    ? [new winston.transports.Console()]
    : [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join(process.cwd(), 'logs', 'exceptions.log') })
      ],
  exitOnError: false,
})

module.exports = logger
