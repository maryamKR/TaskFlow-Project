const Comment = require("../models/Comment");
const Task = require("../models/Task");

const notifyAndEmit = require("../utils/notifyAndEmit");
const { getTaskWithBoardAccess } = require("../utils/taskHelpers");
const { notifyOwner } = require("../utils/notifyOwner");

const { getIO } = require("../socket");

// @desc    Add a comment to a task
// @route   POST /api/tasks/:taskId/comments
exports.addComment = async (req, res) => {
  const { content } = req.body;
  const { taskId } = req.params;

  const { task, board } = await getTaskWithBoardAccess(taskId, req.user._id);
  await task.populate("assignedTo");

  // 3. Create the comment
  const comment = await Comment.create({
    content,
    task: taskId,
    author: req.user._id,
  });

  task.comments.push(comment._id);
  task.activityLog.push({
    action: "Comment added",
    performedBy: req.user._id,
  });
  await task.save();

  // Notification integration logic
  const recipients = new Set();

  // Notify the person the task was assigned to
  if (task.assignedTo) {
    recipients.add(task.assignedTo._id.toString());
  }

  // Notify the person who created the task
  if (task.createdBy) {
    recipients.add(task.createdBy.toString());
  }

  // Never notify the person who just commented
  recipients.delete(req.user._id.toString());

  for (const userId of recipients) {
    try {
      await notifyAndEmit({
        recipientId: userId,
        senderId: req.user._id,
        message: `${req.user.username} commented on: ${task.title}`,
        type: "COMMENT",
        relatedId: taskId,
        boardId: board._id.toString(),
      });
    } catch (err) {
      console.error("NOTIFICATION ERROR:", err.message);
    }
  }

  // Notify the board owner (for moderation) via unified helper
  // This helper handles checking if the actor IS the owner
  await notifyOwner(
    board,
    req.user._id,
    `${req.user.username} commented on: ${task.title}`,
    "COMMENT",
    taskId,
  );

  await comment.populate("author", "username");

  getIO().to(board._id.toString()).emit("comment_added", {
    taskId,
    comment,
  });

  res.status(201).json({ success: true, data: comment });
};

// @desc    Get all comments for a task
// @route   GET /api/tasks/:taskId/comments
exports.getComments = async (req, res) => {
  const { taskId } = req.params;

  await getTaskWithBoardAccess(taskId, req.user._id);

  // 2. Fetch comments and populate author data
  const comments = await Comment.find({ task: taskId })
    .populate("author", "username")
    .sort({ createdAt: -1 }); // Newest comments first

  res.status(200).json({ success: true, data: comments });
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:commentId
exports.deleteComment = async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    res.status(404);
    throw new Error("Comment not found");
  }

  const { board } = await getTaskWithBoardAccess(comment.task, req.user._id);

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
};
