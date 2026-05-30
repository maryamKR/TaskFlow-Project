const Task = require("../models/Task");
const Column = require("../models/Column");
const Board = require("../models/Board");
const Notification = require("../models/Notification");
const Comment = require("../models/Comment");
const asyncHandler = require("express-async-handler");
const { hasBoardAccess } = require("../utils/boardAuth");

const { getIO } = require("../socket");

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private
const createTask = asyncHandler(async (req, res) => {
  const { title, columnId, description, priority, dueDate, assignedTo, label } =
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
    label: label || null,
    dueDate,
    assignedTo: assignedTo || null,
    column: columnId,
    createdBy: req.user._id,
  });

  await task.populate("createdBy", "username");
  await task.populate("assignedTo", "username");

  //Notification Trigger//
  if (
    task.assignedTo &&
    task.assignedTo._id.toString() !== req.user._id.toString()
  ) {
    await Notification.create({
      user: task.assignedTo._id,
      sender: req.user._id,
      message: `${req.user.username} created a new task and assigned it to you: ${task.title}`,
      type: "TASK_ASSIGNED",
      relatedId: task._id,
    });
  }

  // 4. Link task to column
  column.tasks.push(task._id);
  await column.save();

  getIO().to(board._id.toString()).emit("task_created", {
    columnId,
    task,
    createdBy: req.user._id.toString(),
  });

  res.status(201).json({ success: true, data: task });
});

// @desc    Get a single task
// @route   GET /api/tasks/:id
// @access  Private
const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate("assignedTo", "username")
    .populate("createdBy", "username")
    .populate("comments");

  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const column = await Column.findById(task.column);
  if (!column) {
    res.status(404);
    throw new Error("Task not found in any column");
  }
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

  const oldAssignee = task.assignedTo;

  const column = await Column.findById(task.column);
  if (!column) {
    res.status(404);
    throw new Error("Task not found in any column");
  }
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
  await task.populate("assignedTo", "username");

  getIO().to(board._id.toString()).emit("task_updated", {
    taskId: task._id.toString(),
    updatedTask: task,
  });

  const newAssignee = task.assignedTo;

  //--------NOTIFICATION LOGIC -------/
  /*
    1. isAssigneeChanged: Triggers when the task is handed off to a new user.
    2. isDetailsChanged: Triggers when task content (title/desc/priority) is modified.
    3.Prevents self-notification and ensures one notification per request.
    */

  const isAssigneeChanged =
    newAssignee &&
    (!oldAssignee || oldAssignee.toString() !== newAssignee._id.toString()) &&
    newAssignee._id.toString() !== req.user._id.toString();

  const isDetailsChanged =
    (req.body.title || req.body.description || req.body.priority) &&
    task.assignedTo &&
    task.assignedTo._id.toString() !== req.user._id.toString();

  if (isAssigneeChanged) {
    await Notification.create({
      user: newAssignee._id,
      sender: req.user._id,
      message: `${req.user.username} assigned you to the task: ${task.title}`,
      type: "TASK_ASSIGNED",
      relatedId: task._id,
    });
  } else if (isDetailsChanged) {
    await Notification.create({
      user: newAssignee._id,
      sender: req.user._id,
      message: `${req.user.username} updated details on task: ${task.title}`,
      type: "TASK_UPDATED",
      relatedId: task._id,
    });
  }

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
  let board = null;

  if (column) {
    board = await Board.findById(column.board);

    const isOwner = board && board.user.toString() === req.user._id.toString();
    const isCreator = task.createdBy && task.createdBy.toString() === req.user._id.toString();

    if (!isOwner && !isCreator) {
      res.status(403);
      throw new Error("Only the board owner or task creator can delete tasks");
    }

    column.tasks.pull(task._id);
    await column.save();
  }

  // Cascade delete Comments and Notifications for this task
  await Comment.deleteMany({ task: task._id });
  await Notification.deleteMany({ relatedId: task._id });

  await task.deleteOne();

  if (board && column) {
    getIO().to(board._id.toString()).emit("task_deleted", {
      taskId: task._id.toString(),
      columnId: column._id.toString(),
    });
  }

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

  // 1. Validate source column and source board access
  const sourceColumn = await Column.findById(sourceColumnId);
  if (!sourceColumn) {
    res.status(404);
    throw new Error("Source column not found");
  }

  const sourceBoard = await Board.findById(sourceColumn.board);
  if (!sourceBoard || !hasBoardAccess(sourceBoard, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to access the source board");
  }

  // 2. Validate destination column and board access
  const destColumn = await Column.findById(destinationColumnId);
  if (!destColumn) {
    res.status(404);
    throw new Error("Destination column not found");
  }

  const board = await Board.findById(destColumn.board);
  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to access the destination board");
  }

  // 3. Validate task existence and verify it belongs to the source column
  const task = await Task.findById(taskId);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  if (task.column.toString() !== sourceColumnId) {
    res.status(400);
    throw new Error("Task does not belong to the source column");
  }

  // 2. Perform atomic array updates and task reference update
  // A. Remove from source
  await Column.findByIdAndUpdate(sourceColumnId, { $pull: { tasks: taskId } });

  // B. Add to destination
  await Column.findByIdAndUpdate(destinationColumnId, {
    $push: { tasks: taskId },
  });

  // C. Update the task itself to point to the new column (Pointer Synchronization)
  await Task.findByIdAndUpdate(
    taskId,
    { column: destinationColumnId },
    { runValidators: true },
  );

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
  if (!column) {
    res.status(404);
    throw new Error("Column not found");
  }

  const board = await Board.findById(column.board);
  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to reorder this board");
  }

  // Validate that all provided task IDs belong to this column
  const existingTaskIds = new Set(column.tasks.map((id) => id.toString()));
  const allBelong =
    taskIds.length === column.tasks.length &&
    taskIds.every((id) => existingTaskIds.has(id));
  if (!allBelong) {
    res.status(400);
    throw new Error("Invalid reorder: Task IDs do not match this column's tasks");
  }

  // 2. Perform the update
  const updatedColumn = await Column.findByIdAndUpdate(
    columnId,
    { tasks: taskIds },
    { returnDocument: "after" },
  );

  // 3. Emit real-time event
  getIO().to(board._id.toString()).emit("tasks_reordered", {
    columnId,
    taskIds,
  });

  res.status(200).json({ success: true, data: updatedColumn.tasks });
});

// @desc    Get all tasks for a board with optional filtering
// @route   GET /api/tasks?boardId=...&columnId=...&assignedTo=...&priority=...
// @access  Private
const getTasks = asyncHandler(async (req, res) => {
  const {
    boardId,
    columnId,
    assignedTo,
    priority,
    search,
    startDate,
    endDate,
  } = req.query;

  const board = await Board.findById(boardId);

  if (!board) {
    res.status(404);
    throw new Error("Board not found");
  }

  if (!hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized");
  }

  const columns = await Column.find({ board: boardId }).select("_id");
  const columnIds = columns.map((c) => c._id);

  let query = { column: { $in: columnIds } };

  if (search) {
    query.$text = { $search: search };
  }

  if (columnId) query.column = columnId;
  if (assignedTo) query.assignedTo = assignedTo;
  if (priority) query.priority = priority;

  if (startDate || endDate) {
    query.dueDate = {};
    if (startDate) query.dueDate.$gte = new Date(startDate);
    if (endDate) query.dueDate.$lte = new Date(endDate);
  }

  const tasks = await Task.find(query)
    .populate("assignedTo", "username")
    .populate("createdBy", "username");

  res.status(200).json({ success: true, count: tasks.length, data: tasks });
});

module.exports = {
  createTask,
  getTask,
  updateTask,
  deleteTask,
  moveTask,
  reorderTask,
  getTasks,
};
