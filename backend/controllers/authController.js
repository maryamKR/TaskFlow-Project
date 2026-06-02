const User = require('../models/User');
const Board = require('../models/Board');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');

const { hashPassword } = require('../utils/authHelpers');
const { sendPasswordResetEmail } = require('../utils/emailService');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = asyncHandler(async (req, res, next) => {
    const { username, email, password } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
    res.status(400);
    throw new Error('User with this email or username already exists');
}

    // Hash the password before saving
    const hashedPassword = await hashPassword(password);

    // Create the user in MongoDB 
    const user = await User.create({
        username,
        email,
        password: hashedPassword
    });

    // Check for any pending board invitations for this email address
    const cleanEmail = email.trim().toLowerCase();
    const boardsWithPendingInvites = await Board.find({ pendingInvites: cleanEmail });

    for (const board of boardsWithPendingInvites) {
        const isAlreadyCoworker = board.coworkers.some(
            (id) => id.toString() === user._id.toString()
        );
        if (!isAlreadyCoworker) {
            board.coworkers.push(user._id);
        }
        board.pendingInvites = board.pendingInvites.filter(e => e.toLowerCase() !== cleanEmail);
        await board.save();

        console.log(`[Invite Auto-Join] Adding new user ${user.email} as coworker to board ${board.title}`);

        try {
            // Create a notification for the newly registered user
            await Notification.create({
                user: user._id,
                sender: board.user,
                message: `You have been added to the board: ${board.title}`,
                type: "BOARD_INVITATION",
                relatedId: board._id
            });

            // Create a notification for the board owner
            await Notification.create({
                user: board.user,
                sender: user._id,
                message: `${user.username} has joined your board: ${board.title}`,
                type: "BOARD_INVITATION",
                relatedId: board._id
            });
            console.log(`[Invite Auto-Join] Notifications created successfully for user and owner of board ${board.title}`);
        } catch (notifErr) {
            console.error(`[Invite Auto-Join Error] Failed to create notifications:`, notifErr.message);
        }
    }

    // Generate a JWT Token
    const token = jwt.sign(
        { id: user._id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '30d' }
    );

    res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token
    });
});

// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
        { id: user._id }, 
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );

    res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        token
    });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    const genericMessage = 'If an account exists with that email, a reset link has been sent';

    if (!user) {
        return res.status(200).json({ success: true, data: genericMessage });
    }

    // Get reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
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
        throw new Error('Email could not be sent');
    }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password/:resetToken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
    // Get hashed token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resetToken)
        .digest('hex');

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
        res.status(400);
        throw new Error('Invalid token or token expired');
    }

    // Set new password
    user.password = await hashPassword(req.body.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
        success: true,
        data: 'Password reset successful'
    });
});