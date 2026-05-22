const express = require("express");
const router = express.Router();

// Middlewares
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");

// Validators
const {
  createBoardSchema,
} = require("../middleware/validators/boardValidator");

// Controllers
const {
  createBoard,
  getBoards,
  getBoardById,
  deleteBoard,
  reorderColumns
} = require("../controllers/boardController");

const {
  getBoardMembers,
  inviteMember,
} = require("../controllers/boardMemberController");

// console.log("DEBUG: createBoardSchema is", createBoardSchema);
// console.log("Protect:", protect);
// console.log("Validator:", validate(createBoardSchema));
// console.log("Controller:", createBoard);

router
  .route("/")
  .post(protect, validate(createBoardSchema), createBoard)
  .get(protect, getBoards);

router.route("/:id").get(protect, getBoardById).delete(protect, deleteBoard);

router.route("/:boardId/members").get(protect, getBoardMembers);

router.route("/:boardId/invite").post(protect, inviteMember);

router.put('/:boardId/reorder', protect, reorderColumns);

module.exports = router;
