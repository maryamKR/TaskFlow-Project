const asyncHandler = require("express-async-handler");
const Board = require("../models/Board");
const User = require("../models/User");
const { hasBoardAccess } = require("../utils/boardAuth");

// @desc    Get all members of a board
// @route   GET /api/boards/:boardId/members
exports.getBoardMembers = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.boardId).populate(
    "coworkers",
    "username email",
  ).populate(
    "user",
    "username email");

    const members = [board.user, ...board.coworkers];

  if (!board) {
    res.status(404);
    throw new Error("Board not found");
  }
  res.status(200).json(members);
});

// @desc    Invite a user to a board by email
// @route   POST /api/boards/:boardId/invite
exports.inviteMember = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { boardId } = req.params;

  const board = await Board.findById(boardId);
  if (!board) {
    res.status(404);
    throw new Error("Board not found");
  }

  if (!hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("You do not have access to this board");
  }

  if (board.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the board owner can invite members");
  }

  const userToInvite = await User.findOne({ email });
  if (!userToInvite) {
    res.status(404);
    throw new Error("User not found");
  }

  if (userToInvite._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error("You cannot invite yourself to your own board");
  }

  if (board.coworkers.includes(userToInvite._id)) {
    res.status(400);
    throw new Error("User is already a member");
  }

  board.coworkers.push(userToInvite._id);
  await board.save();

  res.status(200).json({
    message: "User invited successfully",
    coworkers: board.coworkers,
  });
});

// @desc    Remove a member from a board
// @route   DELETE /api/boards/:boardId/members/:memberId
exports.removeMember = asyncHandler(async (req, res) => {
  const { boardId, memberId } = req.params;

  const board = await Board.findById(boardId);
  if (!board) {
    res.status(404);
    throw new Error("Board not found");
  }

  if (!hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("You do not have access to this board");
  }

  // Prevent owner from removing themselves
  if (memberId === board.user.toString()) {
    res.status(400);
    throw new Error("You cannot remove the board owner");
  }

  // Remove the member
  board.coworkers = board.coworkers.filter((id) => id.toString() !== memberId);
  await board.save();

  res.status(200).json({
    success: true,
    message: "Member removed successfully",
  });
});
