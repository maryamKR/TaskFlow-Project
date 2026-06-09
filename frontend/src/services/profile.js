import { getBoards } from './board';

export const getMyBoards = async () => {
  const data = await getBoards();
  return data || [];
};