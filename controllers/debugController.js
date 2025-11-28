const logger = require('../utils/logger.js')

const debugHeaders = async (req, res) => {
  const debugKey = process.env.DEBUG_KEY
  const provided = req.headers['x-debug-key'] || req.query.debug_key

  if (debugKey) {
    if (!provided || provided !== debugKey) {
      logger.warn('Attempt to access debug endpoint with invalid key', { path: req.path, origin: req.headers.origin })
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }
  }

  // Mask token values in cookies/authorization
  const mask = (v) => String(v).replace(/(token=)[^;]+/, '$1***')

  const maskedCookies = req.headers.cookie ? mask(req.headers.cookie) : undefined

  logger.info('Debug headers endpoint called', { origin: req.headers.origin, cookies: maskedCookies })

  return res.status(200).json({
    success: true,
    origin: req.headers.origin,
    cookies: maskedCookies,
    headers: {
      authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      'x-debug-key': provided ? '[PROVIDED]' : undefined,
    }
  })
}

module.exports = { debugHeaders }
