const express = require('express');

const router = express.Router();

const { createTask,getTask,updateTask,deleteTask } = require('../controllers/taskController');

const { protect } = require('../middleware/authMiddleware');

const validate = require('../middleware/validate');

const { createTaskSchema } = require('../middleware/validators/taskValidator');

router.get('/:id', protect, getTask);
router.post('/', protect, validate(createTaskSchema), createTask);
router.put('/:id', protect, updateTask);
router.delete('/:id', protect, deleteTask);

module.exports = router;