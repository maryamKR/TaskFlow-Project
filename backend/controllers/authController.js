const User = require('../models/User');
const Board = require('../models/Board');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

const { hashPassword } = require('../utils/authHelpers');

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