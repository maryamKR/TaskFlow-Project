const notifyAndEmit = require("./notifyAndEmit");

/**
 * Sends a notification to the board owner, unless the actor IS the board owner.
 *
 * @param {Object} board - The board document
 * @param {string|ObjectId} actorId - The user performing the action
 * @param {string} message - The notification text
 * @param {string} type - The notification type enum string
 * @param {string|ObjectId} relatedId - The related task or resource ID
 */
const notifyOwner = async (board, actorId, message, type, relatedId) => {
  if (!board) return;
  const boardOwnerId = board.user?._id
    ? board.user._id.toString()
    : board.user.toString();
  if (boardOwnerId === actorId.toString()) return;

  try {
    await notifyAndEmit({
      recipientId: boardOwnerId,
      senderId: actorId,
      message,
      type,
      relatedId,
      boardId: board._id.toString(),
    });
  } catch (err) {
    console.error("OWNER NOTIFICATION ERROR:", err.message);
  }
};

module.exports = { notifyOwner };
