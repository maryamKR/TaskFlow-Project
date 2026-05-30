const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["COMMENT", "TASK_ASSIGNED", "TASK_UPDATED", "BOARD_INVITATION"],
      required: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: false
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
