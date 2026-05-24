const Notification = require("../models/Notification");
const asyncHandler = require("express-async-handler");

// @desc    Get all notifications for the logged-in user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .populate("sender", "username")
    .sort({ createdAt: -1 })
    .limit(30);

  res
    .status(200)
    .json({ success: true, count: notifications.length, data: notifications });
});

// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true },
    { new: true },
  );

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  res.status(200).json({ success: true, data: notification });
});

// @desc    Mark ALL notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { $set: { isRead: true } },
  );

  res
    .status(200)
    .json({ success: true, message: "All notifications marked as read" });
});

// @desc    Delete a single notification
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  // Ensure the user owns this notification
  if (notification.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to delete this notification");
  }

  await notification.deleteOne();

  res.status(200).json({ success: true, message: "Notification deleted" });
});

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/read
// @access  Private
exports.deleteReadNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id, isRead: true });

  res
    .status(200)
    .json({ success: true, message: "Read notifications cleared" });
});
