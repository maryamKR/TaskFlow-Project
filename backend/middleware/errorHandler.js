// Centralized Error Handler Middleware
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log the error to the console for you to see while developing
    console.error('❌ Backend Error:', err);

    // 1. Mongoose Duplicate Key Error (e.g., duplicate email or username)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({ 
            message: `That ${field} is already registered. Please try another one.` 
        });
    }

    // 2. Mongoose Validation Error (e.g., password too short)
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        return res.status(400).json({ message });
    }

    // 3. Fallback for any other unexpected server error
    res.status(error.statusCode || 500).json({
        message: error.message || 'Server Error'
    });
};

module.exports = errorHandler;