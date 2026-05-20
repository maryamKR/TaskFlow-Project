const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = asyncHandler(async (req, res, next) => {
    const { username, email, password } = req.body;

    // Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create the user in MongoDB 
    const user = await User.create({
        username,
        email,
        password: hashedPassword
    });

    // Generate a JWT Token
    const token = jwt.sign(
        { id: user._id }, 
        process.env.JWT_SECRET || 'fallback_secret_for_testing', 
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