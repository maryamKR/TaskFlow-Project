import { useState } from 'react';
import { createTask } from '../services/board';
import { api } from '../services/auth';
import { useTheme } from '../context/ThemeContext';

function CreateTaskModal({ columnId, onClose, onTaskCreated, members = [] }) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('low');
  const [assignee, setAssignee] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [suggesting, setSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  const handleSuggestPriority = async () => {
    if (!title.trim()) { setError('Enter a title first'); return; }
    setSuggesting(true);
    setAiSuggestion(null);
    try {
      const response = await api.post('/ai/suggest-priority', { title });
      const suggested = response.data.priority;
      setPriority(suggested);
      setAiSuggestion(suggested);
    } catch (err) {
      console.error('AI suggestion failed:', err);
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Task title is required'); return; }
    setLoading(true);
    setError('');
    try {
      const newTask = await createTask({ title, columnId, priority, assignedTo: assignee || undefined });
      onTaskCreated(columnId, newTask);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
    isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'
  }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className={`rounded-2xl p-6 w-full max-w-md shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>

        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create Task</h2>
          <button onClick={onClose} className={`text-2xl leading-none ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div>
            <label className={`text-sm mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Task Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Build login page"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className={`${inputClass} ${error ? 'ring-2 ring-red-500' : ''}`}
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Priority</label>
              <button
                type="button"
                onClick={handleSuggestPriority}
                disabled={suggesting}
                className="text-xs text-pink-400 hover:text-pink-300 transition duration-200 disabled:opacity-50"
              >
                {suggesting ? '✨ Thinking...' : '✨ AI Suggest'}
              </button>
            </div>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {aiSuggestion && (
              <p className="text-xs mt-1 text-pink-400">
                ✨ AI suggested: <span className="font-semibold capitalize">{aiSuggestion}</span>
              </p>
            )}
          </div>

          <div>
            <label className={`text-sm mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Assignee</label>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputClass}>
              <option value="">Unassigned</option>
              {members.map(member => (
                <option key={member._id} value={member._id}>{member.username}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 rounded-lg border transition duration-200 ${
                isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-lg bg-pink-700 hover:bg-pink-800 text-white font-semibold transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default CreateTaskModal;