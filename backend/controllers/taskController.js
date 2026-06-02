const Task = require("../models/Task");
const Column = require("../models/Column");
const Board = require("../models/Board");
const Comment = require("../models/Comment");
const asyncHandler = require("express-async-handler");
const { hasBoardAccess } = require("../utils/boardAuth");
const notifyAndEmit = require("../utils/notifyAndEmit"); 
const Notification = require("../models/Notification");
const { getIO } = require("../socket");

// Helper updated to use the unified notification tool and include boardId
const notifyOwner = async (board, actorId, message, type, relatedId) => {
  if (!board) return;
  const boardOwnerId = board.user?._id ? board.user._id.toString() : board.user.toString();
  if (boardOwnerId === actorId.toString()) return;
  
  try {
    await notifyAndEmit({
      recipientId: boardOwnerId,
      senderId: actorId,
      message,
      type,
      relatedId,
      boardId: board._id.toString(), // Added to match the Notification.js schema updates
    });
  } catch (err) {
    console.error("OWNER NOTIFICATION ERROR:", err.message);
  }
};

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

  // Guard block against creating directly in Done column
  if (/^done$/i.test(column.title.trim())) {
    res.status(400);
    throw new Error("Tasks cannot be created directly in the Done column.");
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

  // Notification Trigger via notifyAndEmit
  let assigneeNotified = false;
  if (
    task.assignedTo &&
    task.assignedTo._id.toString() !== req.user._id.toString()
  ) {
    await notifyAndEmit({
      recipientId: task.assignedTo._id,
      senderId: req.user._id,
      message: `${req.user.username} created a new task and assigned it to you: ${task.title}`,
      type: "TASK_ASSIGNED",
      relatedId: task._id,
      boardId: board._id.toString(), // Populated
    });
    if (task.assignedTo._id.toString() === board.user.toString()) {
      assigneeNotified = true;
    }
  }

  // 4. Link task to column
  column.tasks.push(task._id);
  await column.save();

  // Notify owner
  if (!assigneeNotified) {
    await notifyOwner(board, req.user._id, `${req.user.username} created task "${task.title}" on your board`, "OWNER_ALERT", task._id);
  }

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
    .populate("comments")
    .populate("activityLog.performedBy", "username"); // Populated for Activity history tracking view

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

  const changes = [];
  if (req.body.title !== undefined && req.body.title !== task.title) {
    changes.push(`Title changed from "${task.title}" to "${req.body.title}"`);
    task.title = req.body.title;
  }
  if (req.body.description !== undefined && req.body.description !== task.description) {
    changes.push(`Description updated`);
    task.description = req.body.description;
  }
  if (req.body.priority !== undefined && req.body.priority !== task.priority) {
    changes.push(`Priority changed from "${task.priority}" to "${req.body.priority}"`);
    task.priority = req.body.priority;
  }
  if (req.body.dueDate !== undefined) {
    const oldTime = task.dueDate ? new Date(task.dueDate).getTime() : null;
    const newTime = req.body.dueDate ? new Date(req.body.dueDate).getTime() : null;
    if (oldTime !== newTime) {
      changes.push(`Due date updated`);
      task.dueDate = req.body.dueDate;
    }
  }
  if (req.body.assignedTo !== undefined) {
    const oldAssigneeStr = task.assignedTo ? task.assignedTo.toString() : '';
    const newAssigneeStr = req.body.assignedTo ? req.body.assignedTo.toString() : '';
    if (oldAssigneeStr !== newAssigneeStr) {
      changes.push(`Assignee changed`);
      task.assignedTo = req.body.assignedTo || null;
    }
  }

  if (changes.length === 0) {
    await task.populate("assignedTo", "username");
    return res.status(200).json({ success: true, data: task });
  }

  // Push audit records for fields modified inside changes
  for (const action of changes) {
    task.activityLog.push({
      action,
      performedBy: req.user._id,
    });
  }

  await task.save();
  await task.populate("assignedTo", "username");

  const newAssignee = task.assignedTo;

  //--------NOTIFICATION LOGIC -------/
  const hasAssigneeChanged = changes.includes("Assignee changed");
  const hasDetailsChanged = changes.some(c => c !== "Assignee changed");

  const isAssigneeChanged =
    hasAssigneeChanged &&
    newAssignee &&
    newAssignee._id.toString() !== req.user._id.toString();

  const isDetailsChanged =
    hasDetailsChanged &&
    task.assignedTo &&
    task.assignedTo._id.toString() !== req.user._id.toString();

  let assigneeNotified = false;

  // Migrated legacy database writes over to unified real-time tool notifyAndEmit
  if (isAssigneeChanged) {
    await notifyAndEmit({
      recipientId: newAssignee._id,
      senderId: req.user._id,
      message: `${req.user.username} assigned you to the task: ${task.title}`,
      type: "TASK_ASSIGNED",
      relatedId: task._id,
      boardId: board._id.toString(), // Populated
    });
    if (newAssignee._id.toString() === board.user.toString()) {
      assigneeNotified = true;
    }
  } else if (isDetailsChanged) {
    const targetUserId = task.assignedTo._id || task.assignedTo;
    await notifyAndEmit({
      recipientId: targetUserId,
      senderId: req.user._id,
      message: `${req.user.username} updated details on task: ${task.title}`,
      type: "TASK_UPDATED",
      relatedId: task._id,
      boardId: board._id.toString(), // Populated
    });
    if (targetUserId.toString() === board.user.toString()) {
      assigneeNotified = true;
    }
  }

  // Notify owner only if they weren't already notified as the assignee
  if (!assigneeNotified) {
    await notifyOwner(board, req.user._id, `${req.user.username} updated task "${task.title}" on your board`, "OWNER_ALERT", task._id);
  }

  getIO().to(board._id.toString()).emit("task_updated", {
    taskId: task._id.toString(),
    updatedTask: task,
  });

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

    const boardOwnerId = board?.user?._id ? board.user._id.toString() : board?.user?.toString();
    const currentUserId = req.user._id.toString();

    if (boardOwnerId !== currentUserId) {
      res.status(403);
      throw new Error("Only the board owner can delete tasks. Contact your board owner to delete this task.");
    }

    column.tasks.pull(task._id);
    await column.save();
  }

  // Cascade delete Comments and Notifications for this task
  await Comment.deleteMany({ task: task._id });
  await Notification.deleteMany({ relatedId: task._id });

  await task.deleteOne();

  // Notify owner
  if (board) {
    await notifyOwner(board, req.user._id, `${req.user.username} deleted task "${task.title}" from your board`, "OWNER_ALERT");
  }

  if (board && column) {
    getIO().to(board._id.toString()).emit("task_deleted", {
      taskId: task._id.toString(),
      columnId: column._id.toString(),
    });
  }

  res.status(200).json({ success: true, message: "Task deleted successfully" });
});

// @desc    Move a task
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
    res.status(400); // FIXED: Changed query to res
    throw new Error("Task does not belong to the source column");
  }

  // Remove from source and push to destination
  await Column.findByIdAndUpdate(sourceColumnId, { $pull: { tasks: taskId } });
  await Column.findByIdAndUpdate(destinationColumnId, { $push: { tasks: taskId } });

  // Update target column pointer state, isDone evaluation, and state logs
  const isDone = /^done$/i.test(destColumn.title.trim());

  await Task.findByIdAndUpdate(
    taskId,
    {
      column: destinationColumnId,
      isDone, // Automatically toggled based on matches with "/^done$/i"
      $push: {
        activityLog: {
          action: `Moved to column "${destColumn.title}"`, // Appended to audit tracking logs
          performedBy: req.user._id,
        }
      }
    },
    { runValidators: true },
  );

  // Notify owner
  await notifyOwner(board, req.user._id, `${req.user.username} moved task "${task.title}" to "${destColumn.title}" on your board`, "OWNER_ALERT", task._id);

  // Emit real-time event
  getIO().to(board._id.toString()).emit("task_moved", {
    taskId,
    sourceColumnId,
    destinationColumnId,
    isDone,
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

  const existingTaskIds = new Set(column.tasks.map((id) => id.toString()));
  const allBelong =
    taskIds.length === column.tasks.length &&
    taskIds.every((id) => existingTaskIds.has(id));
  if (!allBelong) {
    res.status(400);
    throw new Error("Invalid reorder: Task IDs do not match this column's tasks");
  }

  const updatedColumn = await Column.findByIdAndUpdate(
    columnId,
    { tasks: taskIds },
    { returnDocument: "after" },
  );

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

// @desc    Get task activity history log (New lightweight endpoint)
// @route   GET /api/tasks/:id/activity
// @access  Private
const getTaskActivity = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .select("activityLog column")
    .populate("activityLog.performedBy", "username"); // Provides "Changed by Alice" frontend visualization maps

  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  // Validate viewing user authorization rights before serving log traces
  const column = await Column.findById(task.column);
  if (!column) {
    res.status(404);
    throw new Error("Task does not belong to a valid board hierarchy");
  }
  const board = await Board.findById(column.board);
  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to view this activity log");
  }

  // Sort local sub-documents arrays by newest-first configuration
  const sortedLog = task.activityLog.sort((a, b) => b.timestamp - a.timestamp);

  res.status(200).json({ success: true, data: sortedLog });
});

module.exports = {
  createTask,
  getTask,
  updateTask,
  deleteTask,
  moveTask,
  reorderTask,
  getTasks,
  getTaskActivity, 
};