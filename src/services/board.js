import { api } from './auth';

// ── Boards ──────────────────────────────
export const getBoards = async () => {
  const response = await api.get('/boards');
  console.log('Available boards:', response.data);
  return response.data.data;
};

export const getBoardById = async (boardId) => {
  const response = await api.get(`/boards/${boardId}`);
  return response.data.data;
};

export const createBoard = async (title) => {
  const response = await api.post('/boards', { title });
  return response.data.data;
};

export const deleteBoard = async (boardId) => {
  const response = await api.delete(`/boards/${boardId}`);
  return response.data;
};

// ── Columns ──────────────────────────────
export const createColumn = async (title, boardId) => {
  const response = await api.post('/columns', { title, boardId });
  return response.data.data;
};

// ── Tasks ────────────────────────────────
export const createTask = async (taskData) => {
  const response = await api.post('/tasks', taskData);
  console.log('Create task response:', response.data); // ← see what Asmaa returns
  return response.data.data || response.data;
};
export const updateTask = async (taskId, taskData) => {
  const response = await api.put(`/tasks/${taskId}`, taskData);
  return response.data.data;
};

export const deleteTask = async (taskId) => {
  const response = await api.delete(`/tasks/${taskId}`);
  return response.data;
};

export const moveTask = async (taskId, columnId) => {
  const response = await api.put(`/tasks/${taskId}`, { columnId });
  return response.data.data;
};