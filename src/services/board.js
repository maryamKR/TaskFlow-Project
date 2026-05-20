import { api } from './auth';

// Get all boards
export const getBoards = async () => {
  const response = await api.get('/boards');
  console.log('Available boards:', response.data);
  return response.data;
};

// Get specific board by ID
export const getBoardById = async (boardId) => {
  const response = await api.get(`/boards/${boardId}`);
  return response.data;
};

// Move task to new column
export const moveTask = async (taskId, columnId) => {
  const response = await api.patch(`/tasks/${taskId}/move`, { columnId });
  return response.data;
};