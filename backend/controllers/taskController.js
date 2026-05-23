const Task = require("../models/Task");
const Column = require("../models/Column");
const Board = require("../models/Board");
const asyncHandler = require("express-async-handler");
const { hasBoardAccess } = require("../utils/boardAuth");

const { getIO } = require("../socket");

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
const createTask = asyncHandler(async (req, res) => {
  const { title, columnId, description, priority, dueDate, assignedTo } =
    req.body;

  // 1. Ensure the column exists
  const column = await Column.findById(columnId);
  if (!column) {
    res.status(404);
    throw new Error("Column not found");
  }

  // 2. Ensure the board exists and check access
  const board = await Board.findById(column.board);
  if (!board) {
    res.status(404);
    throw new Error("Associated board not found");
  }

  if (!hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to add tasks to this board");
  }

  // 3. Create the Task
  const task = await Task.create({
    title,
    description,
    priority,
    dueDate,
    assignedTo: assignedTo || null,
    column: columnId, // FIX: Model expects 'column', not 'columnId'
  });

  // 4. Link task to column
  column.tasks.push(task._id);
  await column.save();

  res.status(201).json({ success: true, data: task });
});

// @desc    Get a single task
// @route   GET /api/tasks/:id
// @access  Private
const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const column = await Column.findOne({ tasks: req.params.id });
  if (!column) throw new Error("Task not found in any column");
  const board = await Board.findById(column.board);

  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to view this task");
  }

  res.status(200).json({ success: true, data: task });
});

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const column = await Column.findOne({ tasks: req.params.id });
  if (!column) throw new Error("Task not found in any column");
  const board = await Board.findById(column.board);

  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to update this task");
  }

  task.title = req.body.title || task.title;
  //Nullish Coalescing (??) to preserve original data if field is missing:
  task.description = req.body.description ?? task.description;
  task.priority = req.body.priority ?? task.priority;
  task.dueDate = req.body.dueDate ?? task.dueDate;
  task.assignedTo = req.body.assignedTo ?? task.assignedTo;

  await task.save();

  res.status(200).json({ success: true, data: task });
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  // Find the column containing this task
  const column = await Column.findOne({ tasks: task._id });

  if (column) {
    const board = await Board.findById(column.board);
    if (!board || !hasBoardAccess(board, req.user._id)) {
      res.status(403);
      throw new Error("Not authorized");
    }

    // Pull from the array
    column.tasks.pull(task._id);
    await column.save();
  }

  await task.deleteOne();
  res.status(200).json({ success: true, message: "Task deleted successfully" });
});

//// @desc   Move a task
// @route   PATCH /api/tasks/move
// @access  Private
const moveTask = asyncHandler(async (req, res) => {
  const { taskId, sourceColumnId, destinationColumnId } = req.body;

  if (!taskId || !sourceColumnId || !destinationColumnId) {
    res.status(400);
    throw new Error("Missing required fields");
  }

  if (sourceColumnId === destinationColumnId) {
    return res.status(200).json({ success: true, message: "No move needed" });
  }

  // 1. Validate destination column and board access
  const destColumn = await Column.findById(destinationColumnId);
  if (!destColumn) throw new Error("Destination column not found");

  const board = await Board.findById(destColumn.board);
  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized");
  }

  // 2. Perform atomic array updates and task reference update
  // A. Remove from source
  await Column.findByIdAndUpdate(sourceColumnId, { $pull: { tasks: taskId } });

  // B. Add to destination
  await Column.findByIdAndUpdate(destinationColumnId, {
    $push: { tasks: taskId },
  });

  // C. Update the task itself to point to the new column (Pointer Synchronization)
  await Task.findByIdAndUpdate(taskId, { column: destinationColumnId }, { runValidators: true });

  // D. Emit real-time event 
  getIO().to(board._id.toString()).emit("task_moved", {
    taskId,
    sourceColumnId,
    destinationColumnId,
  });

  res.status(200).json({ success: true, message: "Task moved successfully" });
});

// @desc    Reorder tasks within a column
// @route   PATCH /api/columns/:columnId/reorder
// @access  Private
const reorderTask = asyncHandler(async (req, res) => {
  const { taskIds } = req.body;
  const { columnId } = req.params;

  const column = await Column.findById(columnId);
  if (!column) throw new Error("Column not found");

  const board = await Board.findById(column.board);
  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to reorder this board");
  }

  // 2. Perform the update
  const updatedColumn = await Column.findByIdAndUpdate(
    columnId, 
    { tasks: taskIds }, 
    { returnDocument: 'after' }
  );

  res.status(200).json({ success: true, data: updatedColumn.tasks });
});

module.exports = { createTask, getTask, updateTask, deleteTask, moveTask, reorderTask};
