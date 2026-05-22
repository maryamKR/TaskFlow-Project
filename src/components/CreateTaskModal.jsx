import { useState } from 'react';
import { createTask } from '../services/board';

function CreateTaskModal({ columnId, onClose, onTaskCreated, members = [] }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('low');
  const [assignee, setAssignee] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newTask = await createTask({
        title,
        columnId,
        priority,
        assignedTo: assignee || undefined,
      });
      onTaskCreated(columnId, newTask);
      onClose();
    } catch (err) {
      console.log('Task error:', err.response?.data);
      const errorMessage = err.response?.data?.error
        || err.response?.data?.message
        || 'Failed to create task';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create Task</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Title */}
          <div>
            <label className="text-gray-300 text-sm mb-1 block">
              Task Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Build login page"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className={`w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                error ? 'ring-2 ring-red-500' : 'focus:ring-blue-500'
              }`}
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>

          {/* Priority */}
          <div>
            <label className="text-gray-300 text-sm mb-1 block">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-gray-300 text-sm mb-1 block">Assignee</label>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {members.map(member => (
                <option key={member._id} value={member._id}>
                  {member.username}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Task ✓'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default CreateTaskModal;