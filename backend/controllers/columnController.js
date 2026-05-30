const Column = require('../models/Column');
const Board = require('../models/Board');
const Task = require('../models/Task');
const asyncHandler = require('express-async-handler');
const { hasBoardAccess } = require('../utils/boardAuth');

const { getIO } = require("../socket");

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
  });

  // Add column reference to the Board
  board.columns.push(column._id);
  await board.save();

  getIO().to(boardId).emit("column_added", { column });
  res.status(201).json({ success: true, data: column });
});

// @desc    Get all columns for a board
// @route   GET /api/columns/board/:boardId
// @access  Private
const getColumnsByBoard = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.boardId).populate('columns');;
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
    { returnDocument: 'after', runValidators: true }
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
  if (!board || board.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the board owner can delete columns");
  }

  // Cleanup: Remove reference from board and delete all tasks inside
  await Board.findByIdAndUpdate(column.board, { $pull: { columns: column._id } });
  await Task.deleteMany({ _id: { $in: column.tasks } });
  
  await column.deleteOne();

  getIO().to(board._id.toString()).emit("column_deleted", { columnId: column._id.toString() });
  
  res.status(200).json({ success: true, message: "Column and associated tasks removed" });
});

module.exports = { createColumn, getColumnsByBoard, updateColumn, deleteColumn };

