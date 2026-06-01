const asyncHandler = require("express-async-handler");
const Board = require("../models/Board");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { hasBoardAccess } = require("../utils/boardAuth");
const { sendInviteEmail, sendUnregisteredInviteEmail } = require("../utils/emailService");

// @desc    Get all members of a board
// @route   GET /api/boards/:boardId/members
exports.getBoardMembers = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.boardId).populate(
    "coworkers",
    "username email",
  ).populate(
    "user",
    "username email");

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
    const cleanEmail = email.trim().toLowerCase();
    
    // Check if user is already invited
    if (board.pendingInvites && board.pendingInvites.includes(cleanEmail)) {
      res.status(400);
      throw new Error("User is already invited");
    }

    // Add to pendingInvites
    if (!board.pendingInvites) {
      board.pendingInvites = [];
    }
    board.pendingInvites.push(cleanEmail);
    await board.save();

    // Send invite to register
    await sendUnregisteredInviteEmail(cleanEmail, board.title, req.user.username, req.user.email);

    return res.status(200).json({
      message: "Invitation email sent to unregistered user. They will be added when they sign up.",
      coworkers: board.coworkers,
      pendingInvites: board.pendingInvites,
    });
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

  // Create Notification for the invited user
  await Notification.create({
    user: userToInvite._id,     
    sender: req.user._id,          
    message: `You have been invited to the board: ${board.title}`,
    type: "BOARD_INVITATION",
    relatedId: board._id 
  });

  // Create Notification for the board owner
  await Notification.create({
    user: board.user,
    sender: userToInvite._id,
    message: `${userToInvite.username} has joined your board: ${board.title}`,
    type: "BOARD_INVITATION",
    relatedId: board._id
  });

  // Send invitation email (non-blocking — failure won't affect the response)
  // Platform sends from EMAIL_USER; Reply-To is set to the board owner's email
  await sendInviteEmail(userToInvite.email, board.title, req.user.username, req.user.email);

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

  // Remove the member
  board.coworkers = board.coworkers.filter((id) => id.toString() !== memberId);
  await board.save();

  res.status(200).json({
    success: true,
    message: "Member removed successfully",
  });
});
