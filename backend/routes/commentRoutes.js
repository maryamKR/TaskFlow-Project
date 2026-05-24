const express = require('express');
const router = express.Router();

const { 
    addComment, 
    getComments, 
    deleteComment 
} = require('../controllers/commentController');


const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/tasks/:taskId/comments
// @desc    Add a comment to a task
router.post('/tasks/:taskId/comments', protect, addComment);

// @route   GET /api/tasks/:taskId/comments
// @desc    Get all comments for a task
router.get('/tasks/:taskId/comments', protect, getComments);

// @route   DELETE /api/comments/:commentId
// @desc    Delete a comment
router.delete('/comments/:commentId', protect, deleteComment);

module.exports = router;