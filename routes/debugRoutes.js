const express = require('express')
const router = express.Router()
const { debugHeaders } = require('../controllers/debugController.js')

// Protected debug endpoint to inspect incoming origin and cookies.
// If `DEBUG_KEY` is set in env, requests must include header `X-Debug-Key` with the same value.
router.get('/headers', debugHeaders)

module.exports = router
