const express = require('express');
const router = express.Router();
const { registerUser, loginUser, forgotPassword, resetPassword } = require('../controllers/authController');

const validate = require('../middleware/validate');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../middleware/validators/authValidator');
const { passwordResetLimiter, loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

router.post('/register', registerLimiter, validate(registerSchema), registerUser);
router.post('/login', loginLimiter, validate(loginSchema), loginUser);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:resetToken', validate(resetPasswordSchema), resetPassword);

module.exports = router;