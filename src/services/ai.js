import { api } from './auth';

// 1. Fetch AI board insights message from backend
export const getAiInsight = async (columns) => {
  const allTasks = columns.flatMap(col =>
    (col.tasks || []).map(t => ({
      title: t.title,
      priority: t.priority,
      status: col.title,
      dueDate: t.dueDate,
      assignedTo: t.assignedTo?.username || null,
      createdAt: t.createdAt,
    }))
  );

  if (allTasks.length === 0) return null;

  try {
    const response = await api.post('/ai/board-insight', { allTasks });
    return response.data.insight;
  } catch (error) {
    console.error("Failed fetching board insight:", error);
    return "Could not load real-time AI insights right now.";
  }
};

// 2. Auto-prioritize all board tasks via backend
export const autoPrioritizeTasks = async (columns) => {
  const allTasks = columns.flatMap(col =>
    (col.tasks || []).map(t => ({
      id: t._id,
      title: t.title,
      description: t.description || '',
      status: col.title,
      dueDate: t.dueDate,
      currentPriority: t.priority,
    }))
  );

  if (allTasks.length === 0) return [];

  try {
    const response = await api.post('/ai/auto-prioritize', { allTasks });
    return response.data.priorities || [];
  } catch (error) {
    console.error("Auto-prioritization failed:", error);
    return [];
  }
};