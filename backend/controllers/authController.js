const User = require("../models/User");
const Board = require("../models/Board");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { sendPasswordResetEmail } = require("../utils/emailService");
const notifyAndEmit = require("../utils/notifyAndEmit");
const { notifyOwner } = require("../utils/notifyOwner");

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res, next) => {
  const { username, email, password } = req.body;

  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) {
    res.status(400);
    throw new Error("User with this email or username already exists");
  }

  // Create the user in MongoDB (hashing happens in pre-save hook)
  const user = await User.create({
    username,
    email,
    password,
  });

  // Check for any pending board invitations for this email address
  const cleanEmail = email.trim().toLowerCase();
  const boardsWithPendingInvites = await Board.find({
    pendingInvites: cleanEmail,
  });

  for (const board of boardsWithPendingInvites) {
    const isAlreadyCoworker = board.coworkers.some(
      (id) => id.toString() === user._id.toString(),
    );
    if (!isAlreadyCoworker) {
      board.coworkers.push(user._id);
    }
    board.pendingInvites = board.pendingInvites.filter(
      (e) => e.toLowerCase() !== cleanEmail,
    );
    await board.save();

    console.log(
      `[Invite Auto-Join] Adding new user ${user.email} as coworker to board ${board.title}`,
    );

    try {
      // Notify the newly registered user in real-time
      await notifyAndEmit({
        recipientId: user._id,
        senderId: board.user,
        message: `You have been added to the board: ${board.title}`,
        type: "BOARD_INVITATION",
        boardId: board._id.toString(),
      });

      // Notify the board owner in real-time
      await notifyOwner(
        board,
        user._id,
        `${user.username} has joined your board: ${board.title}`,
        "BOARD_INVITATION"
      );

      console.log(
        `[Invite Auto-Join] Real-time notifications sent for user and owner of board ${board.title}`,
      );
    } catch (notifErr) {
      console.error(
        `[Invite Auto-Join Error] Failed to send notifications:`,
        notifErr.message,
      );
    }
  }

  // Generate a JWT Token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.status(201).json({
    _id: user._id,
    username: user.username,
    email: user.email,
    token,
  });
};

// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.json({
    _id: user._id,
    username: user.username,
    email: user.email,
    token,
  });
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  const genericMessage =
    "If an account exists with that email, a reset link has been sent";

  if (!user) {
    return res.status(200).json({ success: true, data: genericMessage });
  }

  // Get reset token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire (10 minutes)
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  // Create reset url
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

  try {
    await sendPasswordResetEmail(user.email, resetUrl);
    res.status(200).json({ success: true, data: genericMessage });
  } catch (err) {
    console.error(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(500);
    throw new Error("Email could not be sent");
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:resetToken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.resetToken)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select("+password");

  if (!user) {
    res.status(400);
    throw new Error("Invalid token or token expired");
  }

  // Set new password (hashing happens in pre-save hook)
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    data: "Password reset successful",
  });
};
