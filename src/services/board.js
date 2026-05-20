import { api } from './auth';

export const getBoards = async () => {
  const response = await api.get('/boards');
  console.log('Available boards:', response.data);
  return response.data.data; // ← the actual array is inside .data.data
};

export const getBoardById = async (boardId) => {
  const response = await api.get(`/boards/${boardId}`);
  return response.data.data;
};

export const moveTask = async (taskId, columnId) => {
  const response = await api.patch(`/tasks/${taskId}/move`, { columnId });
  return response.data;
};