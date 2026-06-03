const notifyAndEmit = require("./notifyAndEmit");

// Sends a notification to the board owner, unless the actor IS the board owner.

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
