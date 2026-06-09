const express = require('express');
const router = express.Router();
const { registerUser, loginUser, forgotPassword, resetPassword, logoutUser, getMe } = require('../controllers/authController');

const validate = require('../middleware/validate');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../middleware/validators/authValidator');
const { passwordResetLimiter, loginLimiter, registerLimiter } = require('../middleware/rateLimiter');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerLimiter, validate(registerSchema), registerUser);
router.post('/login', loginLimiter, validate(loginSchema), loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:resetToken', validate(resetPasswordSchema), resetPassword);

module.exports = router;