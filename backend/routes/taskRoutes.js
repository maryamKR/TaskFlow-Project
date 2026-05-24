const express = require("express");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");

const {
  createTask,
  getTask,
  updateTask,
  deleteTask,
  moveTask,
  reorderTask,
  getTasks,
} = require("../controllers/taskController");

const {
  createTaskSchema,
  updateTaskSchema,
  getTasksQuerySchema,
} = require("../middleware/validators/taskValidator");



router.get("/:id", protect, getTask);
router.get("/",protect,validate(getTasksQuerySchema),getTasks);
router.post("/", protect, validate(createTaskSchema), createTask);
router.put("/:id", protect, validate(updateTaskSchema), updateTask);
router.patch("/move", protect, moveTask);
router.delete("/:id", protect, deleteTask);
router.patch("/column/:columnId/reorder", protect, reorderTask);

module.exports = router;
