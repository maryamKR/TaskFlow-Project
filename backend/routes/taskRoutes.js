const express = require('express');

const router = express.Router();

const { createTask,getTask,updateTask,deleteTask, moveTask,reorderTask } = require('../controllers/taskController');

const { protect } = require('../middleware/authMiddleware');

const validate = require('../middleware/validate');

const { createTaskSchema, updateTaskSchema } = require('../middleware/validators/taskValidator');

router.get('/:id', protect, getTask);
router.post('/', protect, validate(createTaskSchema), createTask);
router.put('/:id', protect, validate(updateTaskSchema), updateTask);
router.patch('/move', protect, moveTask);
router.delete('/:id', protect, deleteTask);
router.patch("/column/:columnId/reorder", protect, reorderTask);

module.exports = router;
