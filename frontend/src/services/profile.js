import { getBoards, getBoardById } from './board';

export const getMyBoards = async () => {
  const boards  = await getBoards();
  if (!boards || boards.length === 0) return [];
  
  // Fetch each board with full columns and tasks
  const fullBoards = await Promise.all(
    boards.map(board => getBoardById(board._id))
  );
  
  return fullBoards;

  
};