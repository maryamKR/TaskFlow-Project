const express = require('express');
const router = express.Router();
const { suggestPriority } = require('../controllers/aiController');

// Define the POST endpoint
router.post('/suggest-priority', suggestPriority);

module.exports = router;