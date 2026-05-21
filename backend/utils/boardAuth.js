const hasBoardAccess = (board, userId) => {

  // Extract ID string
  const boardOwnerId = board.user?._id ? board.user._id.toString() : board.user.toString();
  const currentUserId = userId.toString();

  const isOwner = boardOwnerId === currentUserId;
  const isCoworker = board.coworkers.some(id => id.toString() === currentUserId);
  
  return isOwner || isCoworker;
};

module.exports = { hasBoardAccess };