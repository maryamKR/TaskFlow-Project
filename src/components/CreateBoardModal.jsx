import { useState } from 'react';
import { api } from '../services/auth';

function CreateBoardModal({ onClose, onBoardCreated }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Board name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/boards', { title });
      onBoardCreated(response.data.data); // ← pass new board back to parent
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Dark overlay behind modal
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">

      {/* Modal box */}
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Create New Board</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-gray-300 text-sm mb-1 block">Board Name</label>
            <input
              type="text"
              placeholder="e.g. Code Arena — Dev Board"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                error ? 'ring-2 ring-red-500' : 'focus:ring-blue-500'
              }`}
              autoFocus
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
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
              {loading ? 'Creating...' : 'Create Board ✓'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default CreateBoardModal;