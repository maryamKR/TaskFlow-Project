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

// 3. Suggest a priority for a single task during update
export const suggestTaskPriority = async (title, description) => {
  try {
    const response = await api.post('/ai/suggest-priority', { title, description });
    return response.data.success ? response.data.priority : null;
  } catch (error) {
    console.error("AI Priority suggestion failed:", error);
    return null;
  }
};

// 4. Auto-detect a matching category label for a single task during update
export const autoDetectLabel = async (title, description) => {
  try {
    const response = await api.post('/ai/auto-label', { title, description });
    return response.data.success ? response.data.label : null;
  } catch (error) {
    console.error("AI Label detection failed:", error);
    return null;
  }
};