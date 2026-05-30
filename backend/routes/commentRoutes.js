const express = require('express');
const router = express.Router();

const { 
    addComment, 
    getComments, 
    deleteComment 
} = require('../controllers/commentController');

const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const {
  addCommentSchema,
  getCommentsSchema,
  deleteCommentSchema,
} = require('../middleware/validators/commentValidator');

// @route   POST /api/tasks/:taskId/comments
// @desc    Add a comment to a task
router.post('/tasks/:taskId/comments', protect, validate(addCommentSchema), addComment);

// @route   GET /api/tasks/:taskId/comments
// @desc    Get all comments for a task
router.get('/tasks/:taskId/comments', protect, validate(getCommentsSchema), getComments);

// @route   DELETE /api/comments/:commentId
// @desc    Delete a comment
router.delete('/comments/:commentId', protect, validate(deleteCommentSchema), deleteComment);

module.exports = router;