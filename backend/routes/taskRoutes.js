const express = require('express');

const router = express.Router();

const { createTask } = require('../controllers/taskController');

const { protect } = require('../middleware/authMiddleware');

const validate = require('../middleware/validate');

const { createTaskSchema } = require('../middleware/validators/taskValidator');


router.post('/', protect, validate(createTaskSchema), createTask);

module.exports = router;