const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../middleware/validators/authValidator');

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);

module.exports = router;