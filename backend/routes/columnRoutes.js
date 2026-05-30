const express = require("express");
const router = express.Router();
const {
  createColumn,
  getColumnsByBoard,
  updateColumn,
  deleteColumn,
} = require("../controllers/columnController");
const { protect } = require("../middleware/authMiddleware");

const validate = require("../middleware/validate");

const {
  createColumnSchema,
  updateColumnSchema,
  getColumnsSchema,
  columnIdParamSchema,
} = require("../middleware/validators/columnValidator");


router.post("/", protect, validate(createColumnSchema), createColumn);

router
  .route("/:id")
  .put(protect, validate(updateColumnSchema), updateColumn)
  .delete(protect, validate(columnIdParamSchema), deleteColumn);

router.route("/board/:boardId").get(protect, validate(getColumnsSchema), getColumnsByBoard);

module.exports = router;
