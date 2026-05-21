import { useState } from 'react';
import { createTask } from '../services/board';

function CreateTaskModal({ columnId, onClose, onTaskCreated }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('Low');
  const [assignee, setAssignee] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks(prev => [...prev, { title: newSubtask, completed: false }]);
    setNewSubtask('');
  };

  const handleRemoveSubtask = (index) => {
    setSubtasks(prev => prev.filter((_, i) => i !== index));
  };

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
        assignee,
        subtasks,
      });
      onTaskCreated(columnId, newTask);
      onClose();
    } catch (err) {
  console.log('Task error:', err.response?.data);
  const errorMessage = err.response?.data?.error 
    || err.response?.data?.message
    || 'Failed to create task';
  setError(errorMessage);
}
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">

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
              <option value="High">🔴 High</option>
              <option value="Med">🟡 Medium</option>
              <option value="Low">🟢 Low</option>
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
              <option value="Selma">Selma</option>
              <option value="Asmaa">Asmaa</option>
              <option value="Maryam">Maryam</option>
            </select>
          </div>

          {/* Subtasks */}
          <div>
            <label className="text-gray-300 text-sm mb-1 block">Subtasks</label>

            {/* Existing subtasks */}
            {subtasks.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {subtasks.map((subtask, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded-lg"
                  >
                    <span className="text-gray-300 text-sm">☐ {subtask.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(index)}
                      className="text-gray-500 hover:text-red-400 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add subtask input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a subtask..."
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition duration-200"
              >
                + Add
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-1">Press Enter or click Add</p>
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