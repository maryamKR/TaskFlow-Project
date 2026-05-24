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

export const reorderColumns = async (boardId, columnIds) => {
  const response = await api.put(`/boards/${boardId}/reorder`, { columnIds }); // ← fixed
  return response.data;
};

// ── Members ──────────────────────────────
export const getBoardMembers = async (boardId) => {
  const response = await api.get(`/boards/${boardId}/members`);
  return response.data;
};

export const inviteMember = async (boardId, email) => {
  const response = await api.post(`/boards/${boardId}/invite`, { email });
  return response.data;
};

export const removeMember = async (boardId, memberId) => {
  const response = await api.delete(`/boards/${boardId}/members/${memberId}`);
  return response.data;
};

// ── Columns ──────────────────────────────
export const createColumn = async (title, boardId) => {
  const response = await api.post('/columns', { title, boardId });
  return response.data.data;
};

export const deleteColumn = async (columnId) => {
  const response = await api.delete(`/columns/${columnId}`);
  return response.data;
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

export const reorderTasks = async (columnId, taskIds) => {
  const response = await api.patch(`/tasks/column/${columnId}/reorder`, { taskIds }); // ← fixed
  return response.data;
};

export const getTasks = async (params) => {
  const response = await api.get('/tasks', { params });
  return response.data.data;
};

// ── Comments ─────────────────────────────
export const getComments = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}/comments`);
  return response.data.data;
};

export const addComment = async (taskId, content) => {
  const response = await api.post(`/tasks/${taskId}/comments`, { content });
  return response.data.data;
};

export const deleteComment = async (commentId) => {
  const response = await api.delete(`/comments/${commentId}`);
  return response.data;
};

// ── Notifications ─────────────────────────
export const getNotifications = async () => {
  const response = await api.get('/notifications');
  console.log('Raw notifications response:', response.data);
  return response.data.data;
};

export const markAllRead = async () => {
  const response = await api.patch('/notifications/read-all');
  return response.data;
};

export const markOneRead = async (notificationId) => {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return response.data;
};

export const deleteReadNotifications = async () => {
  const response = await api.delete('/notifications/read');
  return response.data;
};

export const deleteNotification = async (notificationId) => {
  const response = await api.delete(`/notifications/${notificationId}`);
  return response.data;
};