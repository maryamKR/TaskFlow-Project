import { api } from './auth';

// ── Boards ──────────────────────────────
export const getBoards = async () => {
  const response = await api.get('/boards');
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

// ── Members ──────────────────────────────
export const getBoardMembers = async (boardId) => {
  const response = await api.get(`/boards/${boardId}/members`);
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
  return response.data.data;
};

export const updateTask = async (taskId, taskData) => {
  const response = await api.put(`/tasks/${taskId}`, taskData);
  return response.data.data;
};

export const deleteTask = async (taskId) => {
  const response = await api.delete(`/tasks/${taskId}`);
  return response.data;
};

export const moveTask = async (taskId, sourceColumnId, destinationColumnId) => {
  const response = await api.patch('/tasks/move', {
    taskId,
    sourceColumnId,
    destinationColumnId
  });
  return response.data;
};

export const inviteMember = async (boardId, email) => {
  const response = await api.post(`/boards/${boardId}/invite`, { email });
  return response.data;
};

// Reorder columns
export const reorderColumns = async (boardId, orderedIds) => {
  const response = await api.put(`/boards/${boardId}/reorder`, { columnIds: orderedIds });
  return response.data;
};

// Reorder tasks within a column
export const reorderTasks = async (columnId, orderedIds) => {
  const response = await api.patch(`/tasks/column/${columnId}/reorder`, { taskIds: orderedIds });
  return response.data;
};