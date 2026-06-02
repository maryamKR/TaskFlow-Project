import { useState } from 'react';
import { createColumn } from '../services/board';
import { useTheme } from '../context/ThemeContext';

function AddColumnButton({ boardId, onColumnAdded }) {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Column name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const newColumn = await createColumn(title, boardId);
      onColumnAdded({ ...newColumn, tasks: [] });
      setTitle('');
      setIsOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create column');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return (
    <button
      onClick={() => setIsOpen(true)}
      className="bg-pink-700 hover:bg-pink-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center gap-2"
    >
      + Add Column
    </button>
  );

  return (
    <div className={`rounded-xl p-3 w-64 border shadow-xl ${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Column name..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
            error ? 'ring-2 ring-red-500' : 'focus:ring-pink-500'
          } ${isDark
            ? 'bg-gray-700 text-white placeholder-gray-500'
            : 'bg-gray-100 text-gray-900 placeholder-gray-400'
          }`}
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-pink-700 hover:bg-pink-800 text-white py-2 rounded-lg text-sm font-medium transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Column'}
          </button>
          <button
            type="button"
            onClick={() => { setIsOpen(false); setTitle(''); setError(''); }}
            className={`px-3 py-2 rounded-lg border transition duration-200 ${
              isDark
                ? 'border-gray-600 text-gray-400 hover:bg-gray-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
          >
            ✕
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddColumnButton;