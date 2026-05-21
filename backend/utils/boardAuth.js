/**
 * Checks if the user is the owner of the board or a coworker
 * @param {Object} board - The Mongoose Board document
 * @param {String} userId - The ID of the current user (req.user._id)
 * @returns {Boolean}
 */


const hasBoardAccess = (board, userId) => {
  const isOwner = board.user.toString() === userId.toString();
  const isCoworker = board.coworkers.some(
    (coworkerId) => coworkerId.toString() === userId.toString()
  );
  return isOwner || isCoworker;
};

module.exports = { hasBoardAccess };
