const Task = require("../models/Task");
const Column = require("../models/Column");
const Board = require("../models/Board");
const { hasBoardAccess } = require("./boardAuth");


// Helper to fetch a task, its column, and board, and verify the user's access rights.
// Reduces boilerplate validation code across multiple task and comment controllers.

const getTaskWithBoardAccess = async (taskId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  const column = await Column.findById(task.column);
  if (!column) {
    const error = new Error("Task not found in any column");
    error.statusCode = 404;
    throw error;
  }

  const board = await Board.findById(column.board);
  if (!board || !hasBoardAccess(board, userId)) {
    const error = new Error("Not authorized to view this task");
    error.statusCode = 403;
    throw error;
  }

  return { task, column, board };
};

module.exports = { getTaskWithBoardAccess };
