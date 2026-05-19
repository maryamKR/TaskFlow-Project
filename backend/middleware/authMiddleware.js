const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    // 1. Check if the incoming request has an Authorization header starting with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Split "Bearer <token_string>" to isolate the actual token
            token = req.headers.authorization.split(' ')[1];

            // 2. Decode and verify the token signature
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Fetch the user profile from the database using the ID inside the token
            // Attach it directly to the 'req.user' object (minus the password)
            req.user = await User.findById(decoded.id);

            // Move to the next controller function safely
            return next();
        } catch (error) {
            res.status(401);
            throw new Error('Not authorized, token verification failed');
        }
    }

    // If no token was provided at all
    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token provided');
    }
});

module.exports = { protect };