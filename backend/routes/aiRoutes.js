const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { suggestPriority, autoLabel, getBoardInsight, autoPrioritize } = require('../controllers/aiController');

// Define the POST endpoint
router.post('/suggest-priority', protect, suggestPriority);
router.post("/auto-label", protect, autoLabel);
router.post('/board-insight', getBoardInsight); 
router.post('/auto-prioritize', autoPrioritize);

module.exports = router;