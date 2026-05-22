const Task = require("../models/Task");
const Column = require("../models/Column");
const Board = require("../models/Board");
const asyncHandler = require("express-async-handler");
const { hasBoardAccess } = require("../utils/boardAuth");

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
const createTask = asyncHandler(async (req, res) => {
  const { title, columnId, description, priority, dueDate, assignedTo } = req.body;

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
    column: columnId,
    assignedTo: assignedTo || null,
    position: column.tasks.length
    
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
  const task = await Task.findById(req.params.id).populate("column", "title");

  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const column = await Column.findById(task.column);
  const board = await Board.findById(column?.board);

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

  const column = await Column.findById(task.column);
  const board = await Board.findById(column?.board);

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

  const column = await Column.findById(task.column);
  const board = await Board.findById(column?.board);

  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to delete this task");
  }

  if (column) {
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

  // 2. Validate input
  if (!taskId || !sourceColumnId || !destinationColumnId) {
    res.status(400);
    throw new Error(
      "Missing required fields: taskId, sourceColumnId, or destinationColumnId",
    );
  }

  const task = await Task.findById(taskId);

  if (!task) throw new Error("Task not found");

  const sourceColumn = await Column.findById(sourceColumnId);
  const board = await Board.findById(sourceColumn?.board);

  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to delete this task");
  }

  //Move logic :
  // If it's already in the destination, just return succes
  if (task.column.toString() === destinationColumnId) {
    return res
      .status(200)
      .json({ success: true, message: "Task already in destination" });
  }

  //A remove the task from source column
  await Column.findByIdAndUpdate(sourceColumnId, {
    $pull: { tasks: taskId } });

  //B add task to description column
  await Column.findByIdAndUpdate(destinationColumnId, {
    $push: { tasks: taskId },
  });

  //C Update the column reference on the task itself
  task.column = destinationColumnId;
  await task.save();

  res.status(200).json({ success: true, message: "Task moved successfully" , data: task });
});

module.exports = { createTask, getTask, updateTask, deleteTask, moveTask };
