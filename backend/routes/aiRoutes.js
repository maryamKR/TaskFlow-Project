const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { suggestPriority, autoLabel } = require('../controllers/aiController');

// Define the POST endpoint
router.post('/suggest-priority', protect, suggestPriority);
router.post("/auto-label", protect, autoLabel);

module.exports = router;