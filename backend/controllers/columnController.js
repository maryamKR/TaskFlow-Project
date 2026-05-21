const Column = require('../models/Column');
const Board = require('../models/Board');
const Task = require('../models/Task');
const asyncHandler = require('express-async-handler');
const { hasBoardAccess } = require('../utils/boardAuth');

// @desc    Create a column
// @route   POST /api/columns
// @access  Private
const createColumn = asyncHandler(async (req, res) => {
  const { title, boardId } = req.body;

  const board = await Board.findById(boardId);
  if (!board) {
    res.status(404);
    throw new Error("Board not found");
  }

  if (!hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to add columns to this board");
  }

  const column = await Column.create({
    title,
    board: boardId,
    position: board.columns.length // Simple auto-position
  });

  // Add column reference to the Board
  board.columns.push(column._id);
  await board.save();

  res.status(201).json({ success: true, data: column });
});

// @desc    Get all columns for a board
// @route   GET /api/columns/board/:boardId
// @access  Private
const getColumnsByBoard = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.boardId);
  if (!board) {
    res.status(404);
    throw new Error("Board not found");
  }

  if (!hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to view columns on this board");
  }

  const columns = await Column.find({ board: req.params.boardId }).sort({ position: 1 });
  res.status(200).json({ success: true, data: columns });
});

// @desc    Update a column
// @route   PUT /api/columns/:id
// @access  Private
const updateColumn = asyncHandler(async (req, res) => {
  const column = await Column.findById(req.params.id);

  if (!column) {
    res.status(404);
    throw new Error("Column not found");
  }

  const board = await Board.findById(column.board);
  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to update this column");
  }

  const updatedColumn = await Column.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: updatedColumn });
});

// @desc    Delete a column
// @route   DELETE /api/columns/:id
// @access  Private
const deleteColumn = asyncHandler(async (req, res) => {
  const column = await Column.findById(req.params.id);

  if (!column) {
    res.status(404);
    throw new Error("Column not found");
  }

  const board = await Board.findById(column.board);
  if (!board || !hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to delete this column");
  }

  // Cleanup: Remove reference from board and delete all tasks inside
  await Board.findByIdAndUpdate(column.board, { $pull: { columns: column._id } });
  await Task.deleteMany({ column: column._id });
  
  await column.deleteOne();
  
  res.status(200).json({ success: true, message: "Column and associated tasks removed" });
});

module.exports = { createColumn, getColumnsByBoard, updateColumn, deleteColumn };

