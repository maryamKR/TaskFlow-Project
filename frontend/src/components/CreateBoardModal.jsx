import { useState } from 'react';
import { api } from '../services/auth';
import { useTheme } from '../context/ThemeContext';

function CreateBoardModal({ onClose, onBoardCreated }) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Board name is required'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/boards', { title });
      onBoardCreated(response.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className={`rounded-2xl p-6 w-full max-w-md shadow-xl ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>

        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Create New Board
          </h2>
          <button
            onClick={onClose}
            className={`text-2xl leading-none ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
          >×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={`text-sm mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Board Name
            </label>
            <input
              type="text"
              placeholder="e.g. Code Arena — Dev Board"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                error ? 'ring-2 ring-red-500' : 'focus:ring-pink-500'
              } ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'}`}
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
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
              {loading ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateBoardModal;