const Notification = require("../models/Notification");
const { getIO } = require("../socket");

/**
 * Shared Socket Plan Helper
 */
const notifyAndEmit = async ({ recipientId, senderId, message, type, relatedId, boardId }) => {
  // 1. Commit notification entry to database
  const notification = await Notification.create({
    user: recipientId,
    sender: senderId,
    message,
    type,
    relatedId,
    boardId, // Added matching schema designs
  });

  // 2. Populate sender info so the UI can print names instantly
  await notification.populate("sender", "username email");

  // 3. Extract the real-time server instance and push to the custom user room channel
  const io = getIO();
  const targetRoom = `user:${recipientId}`; // Matches your socket.js format
  
  io.to(targetRoom).emit("new_notification", {
    notification,
  });

  return notification;
};

module.exports = notifyAndEmit;