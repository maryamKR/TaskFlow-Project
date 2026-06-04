import { api } from './auth';

// 1. Fetch AI board insights message from backend using boardId
export const getAiInsight = async (boardId) => {
  if (!boardId) return null;

  try {
    const response = await api.post('/ai/board-insight', { boardId });
    return response.data.insight;
  } catch (error) {
    console.error("Failed fetching board insight:", error);
    return "Could not load real-time AI insights right now.";
  }
};

// 2. Auto-prioritize all board tasks via backend using boardId
export const autoPrioritizeTasks = async (boardId) => {
  if (!boardId) return [];

  try {
    const response = await api.post('/ai/auto-prioritize', { boardId });
    return response.data.priorities || [];
  } catch (error) {
    console.error("Auto-prioritization failed:", error);
    return [];
  }
};