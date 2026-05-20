const express = require('express');
const router = express.Router();
const { createTask } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const { validateTask } = require('../middleware/validators/taskValidator');


router.post('/', protect, validateTask, createTask);

module.exports = router;