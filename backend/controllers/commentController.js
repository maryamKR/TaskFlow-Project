const Comment = require("../models/Comment");
const Board = require("../models/Board");
const Column = require("../models/Column");
const Task = require("../models/Task");
const Notification = require("../models/Notification");
const asyncHandler = require("express-async-handler");
const { hasBoardAccess } = require("../utils/boardAuth");

const { getIO } = require("../socket");

// @desc    Add a comment to a task
// @route   POST /api/tasks/:taskId/comments
exports.addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { taskId } = req.params;

  // 1. Verify task exists
  const task = await Task.findById(taskId);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  // 2. Fetch Board to check access
  const column = await Column.findById(task.column);
  const board = await Board.findById(column.board);

  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("You do not have access to comment on this board");
  }

  // 3. Create the comment
  const comment = await Comment.create({
    content,
    task: taskId,
    author: req.user._id,
  });

  task.comments.push(comment._id);
  await task.save();

  //notification integration//
  if (task.assignee && task.assignee.toString() !== req.user._id.toString()) {
    await Notification.create({
      user: task.assignee,
      sender: req.user._id,
      message: `${req.user.username} commented on your task: ${task.title}`,
      type: "COMMENT",
      relatedId: taskId,
    });
  }

  await comment.populate("author", "username");

  await comment.populate("author", "username");

  getIO().to(board._id.toString()).emit("comment_added", {
    taskId,
    comment,
  });

  res.status(201).json({ success: true, data: comment });
});

// @desc    Get all comments for a task
// @route   GET /api/tasks/:taskId/comments
exports.getComments = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await Task.findById(taskId);
  if (!task) {
    res.status(404);
    throw new Error("Task not found");
  }

  const column = await Column.findById(task.column);
  const board = await Board.findById(column.board);

  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to view comments on this board");
  }

  // 2. Fetch comments and populate author data
  const comments = await Comment.find({ task: taskId })
    .populate("author", "username")
    .sort({ createdAt: -1 }); // Newest comments first

  res.status(200).json({ success: true, data: comments });
});

// @desc    Delete a comment
// @route   DELETE /api/comments/:commentId
exports.deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    res.status(404);
    throw new Error("Comment not found");
  }

  const task = await Task.findById(comment.task);
  if (!task) {
    res.status(404);
    throw new Error("Associated task not found");
  }

  // 2. Fetch Board to check access
  const column = await Column.findById(task.column);
  const board = await Board.findById(column.board);

  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("You do not have access to this board");
  }
  
  const isAuthor = comment.author.toString() === req.user._id.toString();
  const isOwner = board.user.toString() === req.user._id.toString();

  // 3. Authorization: Only the author or board owner can delete their comment
  if (!isAuthor && !isOwner) {
    res.status(403);
    throw new Error("You are not authorized to delete this comment");
  }

  // 4. Remove from Task reference array
  await Task.findByIdAndUpdate(comment.task, {
    $pull: { comments: commentId },
  });

  // 5. Delete the comment
  await comment.deleteOne();

  getIO().to(board._id.toString()).emit("comment_deleted", {
    taskId: comment.task.toString(),
    commentId,
  });

  res
    .status(200)
    .json({ success: true, message: "Comment deleted successfully" });
});
