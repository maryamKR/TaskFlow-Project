const express = require('express');
const router = express.Router();
const { createColumn } = require('../controllers/columnController');
const { protect } = require('../middleware/authMiddleware');

const validate = require('../middleware/validate');
const { createColumnSchema } = require('../middleware/validators/columnValidator');

router.post('/', protect, validate(createColumnSchema), createColumn);

module.exports = router;