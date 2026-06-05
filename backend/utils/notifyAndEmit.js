const Notification = require("../models/Notification");
const { getIO } = require("../socket");

/**
 * Shared Socket Plan Helper
 */
const notifyAndEmit = async ({ recipientId, senderId, message, type, relatedId, boardId }) => {
  try {
    if (!recipientId) return null;

    // 1. Commit notification entry to database
    const notification = await Notification.create({
      user: recipientId,
      sender: senderId,
      message,
      type,
      relatedId,
      boardId, 
    });

    // 2. Populate sender info so the UI can print names instantly
    await notification.populate("sender", "username email");

    // 3. Extract the real-time server instance and push to the custom user room channel
    const io = getIO();
    const targetRoom = `user:${recipientId}`; // Matches your socket.js format
    
    // Dispatches wrapped object payload matching Navbar.jsx's destructured listener
    io.to(targetRoom).emit("new_notification", {
      notification,
    });

    return notification;
  } catch (error) {
    // Audit-compliant graceful warning so notification errors don't crash core task processes
    if (process.env.NODE_ENV !== 'production') {
      console.error("Error handled inside notifyAndEmit helper utility:", error.message);
    }
    return null;
  }
};

module.exports = notifyAndEmit;