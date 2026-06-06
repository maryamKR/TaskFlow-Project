const Board = require("../models/Board");
const Column = require("../models/Column");
const Task = require("../models/Task");
const Comment = require("../models/Comment");
const Notification = require("../models/Notification");
const { hasBoardAccess } = require("../utils/boardAuth");
const { notifyOwner } = require("../utils/notifyOwner");
const { getIO } = require("../socket");

// @desc    Create a new project board
const createBoard = async (req, res) => {
  const { title, coworkers } = req.body;

  const board = await Board.create({
    title,
    user: req.user._id,
    coworkers: coworkers || [],
  });

  const DEFAULT_COLUMNS = ["To Do", "In Progress", "Review", "Done"];
  const columnData = DEFAULT_COLUMNS.map((title, index) => ({
    title,
    board: board._id,
    position: index,
  }));

  const createdColumns = await Column.insertMany(columnData);

  board.columns = createdColumns.map((col) => col._id);
  await board.save();

  const populatedBoard = await Board.findById(board._id).populate("columns");
  res.status(201).json({ success: true, data: populatedBoard });
};

// @desc    Get all boards
const getBoards = async(req, res) => {
    const boards = await Board.find({
        $or: [{ user: req.user._id }, { coworkers: req.user._id }]
    })
    .sort({ createdAt: -1 })
    .select("title user coworkers createdAt"); 

    res.status(200).json({ success: true, count: boards.length, data: boards });
};

// @desc    Get board by ID
const getBoardById = async (req, res) => {
  const board = await Board.findById(req.params.id)
    .populate({
      path: "columns",
      populate: {
        path: "tasks",
        populate: [
          { path: "assignedTo", select: "username isOnline" },
          { path: "createdBy", select: "username" },
        ],
      },
    })
    .populate({ path: "user", select: "-password" });

  if (!board) {
    res.status(404);
    throw new Error("Board not found");
  }

  if (!hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("You do not have permission to view this board");
  }

  res.status(200).json({ success: true, data: board });
};

// @desc    Delete board
const deleteBoard = async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) {
    res.status(404);
    throw new Error("Board not found");
  }

  if (board.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the owner can delete this board");
  }

  // Find all task IDs within columns of the deleted board
  const tasks = await Task.find({ column: { $in: board.columns } }).select(
    "_id",
  );
  const taskIds = tasks.map((t) => t._id);

  // Cascade delete Comments, Notifications, Tasks, and Columns
  await Comment.deleteMany({ task: { $in: taskIds } });
  await Notification.deleteMany({
    $or: [{ relatedId: { $in: taskIds } }, { boardId: board._id }],
  });

  await Task.deleteMany({ _id: { $in: taskIds } });
  await Column.deleteMany({ board: board._id });
  await board.deleteOne();

  res
    .status(200)
    .json({ success: true, message: "Board and all associated data removed" });
};

// @desc    Reorder columns in a board
// @route   PUT /api/boards/:boardId/reorder
// @access  Private
const reorderColumns = async (req, res) => {
  const { boardId } = req.params;
  const { columnIds } = req.body;

  const board = await Board.findById(boardId);
  if (!board) {
    res.status(404);
    throw new Error("Board not found");
  }

  if (!hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("Not authorized to modify this board");
  }

  if (columnIds.length !== board.columns.length) {
    res.status(400);
    throw new Error("Mismatched column count");
  }

  // Validate every incoming ID actually belongs to this board and no duplicates
  const ids = columnIds.map((id) => id.toString());
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    res.status(400);
    throw new Error("Duplicate column IDs detected");
  }

  const boardColumnSet = new Set(board.columns.map((id) => id.toString()));
  const allBelong = ids.every((id) => boardColumnSet.has(id));
  if (!allBelong) {
    res.status(400);
    throw new Error("Column IDs do not match the board's columns");
  }

  board.columns = columnIds;
  await board.save();

  await notifyOwner(
    board,
    req.user._id,
    `${req.user.username} reordered the columns on your board`,
    "OWNER_ALERT",
    board._id
  );

  getIO().to(boardId).emit("columns_reordered", { columnIds });

  res.status(200).json({ success: true, data: board.columns });
};

module.exports = {
  createBoard,
  getBoards,
  getBoardById,
  deleteBoard,
  reorderColumns,
};
