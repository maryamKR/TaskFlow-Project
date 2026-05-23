const asyncHandler = require("express-async-handler");
const Board = require("../models/Board");
const Column = require("../models/Column");
const Task = require("../models/Task");
const { hasBoardAccess } = require('../utils/boardAuth');
const { getIO } = require("../socket");

// @desc    Create a new project board
const createBoard = asyncHandler(async (req, res) => {
  const { title, coworkers } = req.body;

  const board = await Board.create({ 
      title, 
      user: req.user._id, 
      coworkers: coworkers || [] 
  });

  const DEFAULT_COLUMNS = ["To Do", "In Progress", "Review", "Done"];
  const columnData = DEFAULT_COLUMNS.map((title, index) => ({
    title,
    board: board._id,
    position: index,
  }));

  const createdColumns = await Column.insertMany(columnData);

  board.columns = createdColumns.map(col => col._id);
  await board.save();

  const populatedBoard = await Board.findById(board._id).populate("columns");
  res.status(201).json({ success: true, data: populatedBoard });
});

// @desc    Get all boards
const getBoards = asyncHandler(async(req, res) => {
    const boards = await Board.find({
        $or: [{ user: req.user._id }, { coworkers: req.user._id }]
    })
    .sort({ createdAt: -1 })
    .populate({ path: 'columns', populate: { path: 'tasks' }});

    res.status(200).json({ success: true, count: boards.length, data: boards });
});

// @desc    Get board by ID
const getBoardById = asyncHandler(async (req, res) => {
    const board = await Board.findById(req.params.id)
        .populate({ path: 'columns', populate: { path: "tasks" }})
        .populate({ path: 'user', select: '-password' });

    if(!board) {
        res.status(404);
        throw new Error("Board not found");
    }

    if (!hasBoardAccess(board, req.user._id)) {
        res.status(403);
        throw new Error("You do not have permission to view this board");
    }

    res.status(200).json({ success: true, data: board });
});

// @desc    Delete board
const deleteBoard = asyncHandler(async (req, res) => {
    const board = await Board.findById(req.params.id);
    if(!board) {
        res.status(404);
        throw new Error("Board not found");
    }

    if(board.user.toString() !== req.user._id.toString()){
        res.status(403);
        throw new Error("Only the owner can delete this board");
    }
    
    await Task.deleteMany({ column: { $in: board.columns } });
    await Column.deleteMany({ board: board._id });
    await board.deleteOne();

    res.status(200).json({ success: true, message: "Board and all associated data removed" });
});

// @desc    Reorder columns in a board
// @route   PUT /api/boards/:boardId/reorder
// @access  Private
const reorderColumns = asyncHandler(async (req, res) => {
  const { boardId } = req.params;
  const { columnIds } = req.body;

  const board = await Board.findById(boardId);
  if (!board) {
    res.status(404);
    throw new Error("Board not found");
  }

  if (!hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to reorder columns");
  }

  if (columnIds.length !== board.columns.length) {
    res.status(400);
    throw new Error("Invalid reorder: Column count mismatch");
  }

  board.columns = columnIds;
  await board.save();

  getIO().to(boardId).emit("columns_reordered", { columnIds });

  res.status(200).json({ success: true, data: board.columns });
});

module.exports = { createBoard, getBoards, getBoardById, deleteBoard, reorderColumns };