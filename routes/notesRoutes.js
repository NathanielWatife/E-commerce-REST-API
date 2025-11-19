const express = require('express')
const { getNotes } = require('../controllers/notesController.js')

const router = express.Router()

router.get('/', getNotes)

module.exports = router
