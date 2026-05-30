const express = require("express");
const router = express.Router();

// Middlewares
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");

// Validators
const {
  createBoardSchema,
  inviteMemberSchema,
  reorderColumnsSchema,
  boardIdParamSchema,
  boardMemberParamSchema,
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
  removeMember,
} = require("../controllers/boardMemberController");

// console.log("DEBUG: createBoardSchema is", createBoardSchema);
// console.log("Protect:", protect);
// console.log("Validator:", validate(createBoardSchema));
// console.log("Controller:", createBoard);

router
  .route("/")
  .post(protect, validate(createBoardSchema), createBoard)
  .get(protect, getBoards);

router
  .route("/:id")
  .get(protect, validate(boardIdParamSchema), getBoardById)
  .delete(protect, validate(boardIdParamSchema), deleteBoard);

router.route("/:boardId/invite").post(protect, validate(inviteMemberSchema), inviteMember);

router.put('/:boardId/reorder', protect, validate(reorderColumnsSchema), reorderColumns);

router.route("/:boardId/members").get(protect, validate(boardIdParamSchema), getBoardMembers);

router.delete("/:boardId/members/:memberId", protect, validate(boardMemberParamSchema), removeMember);



module.exports = router;
