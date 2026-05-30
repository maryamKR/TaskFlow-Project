const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
} = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { notificationIdParamSchema } = require("../middleware/validators/notificationValidator");

router.get("/", protect, getNotifications);
router.patch("/read-all", protect, markAllAsRead);
router.patch("/:id/read", protect, validate(notificationIdParamSchema), markAsRead);

router.delete("/read", protect, deleteReadNotifications);
router.delete("/:id", protect, validate(notificationIdParamSchema), deleteNotification);

module.exports = router;
