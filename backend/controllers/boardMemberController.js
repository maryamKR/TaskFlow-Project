const asyncHandler = require("express-async-handler");
const Board = require("../models/Board");
const User = require("../models/User");
const { hasBoardAccess } = require("../utils/boardAuth");
const notifyAndEmit = require("../utils/notifyAndEmit"); 
const { sendInviteEmail } = require("../utils/emailService"); 

// @desc    Get all members of a board
// @route   GET /api/boards/:boardId/members
exports.getBoardMembers = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.boardId)
    .populate("coworkers", "username email isOnline") // Added isOnline to reflect active indicators
    .populate("user", "username email isOnline");

  if (!board) {
    res.status(404);
    throw new Error("Board not found");
  }

  if (!hasBoardAccess(board, req.user._id)) {
    res.status(403);
    throw new Error("You do not have access to this board");
  }

  const members = [board.user, ...board.coworkers];
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

  if (board.coworkers.some((id) => id.toString() === userToInvite._id.toString())) {
    res.status(400);
    throw new Error("User is already a member");
  }

  // Update Board
  board.coworkers.push(userToInvite._id);
  await board.save();

  // Create real-time notification with populate routing parameters
  await notifyAndEmit({
    recipientId: userToInvite._id,
    senderId: req.user._id,
    message: `You have been invited to the board: ${board.title}`,
    type: "BOARD_INVITATION",
    relatedId: board._id,
    boardId: board._id.toString(), // Structured matching
  });

  // Call Nodemailer service to deliver the out-of-app email alert
  try {
    await sendInviteEmail(userToInvite.email, board.title, req.user.username);
  } catch (emailErr) {
    // Log error but don't fail the request if out-of-app notification delivery struggles
    console.error("Failed to send invitation email:", emailErr.message);
  }

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

  if (board.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the board owner can remove members. Contact your board owner.");
  }

  // Prevent owner from removing themselves
  if (memberId === board.user.toString()) {
    res.status(400);
    throw new Error("You cannot remove the board owner");
  }

  // Verify the targeted individual is actually on the board before proceeding
  const isMember = board.coworkers.some((id) => id.toString() === memberId);
  if (!isMember) {
    res.status(400);
    throw new Error("This user is not a member of this board");
  }

  // Remove the member
  board.coworkers = board.coworkers.filter((id) => id.toString() !== memberId);
  await board.save();

  // Trigger real-time removal alert to the user being kicked out
  await notifyAndEmit({
    recipientId: memberId,
    senderId: req.user._id,
    message: `You have been removed from the board: ${board.title}`,
    type: "MEMBER_REMOVED", // Extended Enum Type applied
    boardId: boardId.toString(),
  });

  res.status(200).json({
    success: true,
    message: "Member removed successfully",
  });
});