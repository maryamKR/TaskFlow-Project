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
    if (!title.trim()) { setError('Column name is required'); return; }
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

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-pink-700 hover:bg-pink-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center gap-2"
      >
        + Add Column
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 w-full max-w-sm shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>New Column</h2>
              <button
                onClick={() => { setIsOpen(false); setTitle(''); setError(''); }}
                className={`text-2xl leading-none ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
              >×</button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className={`text-sm mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Column name</label>
                <input
                  type="text"
                  placeholder="e.g. Backlog"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                    error ? 'ring-2 ring-red-500' : 'focus:ring-pink-500'
                  } ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'}`}
                />
                {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); setTitle(''); setError(''); }}
                  className={`flex-1 py-3 rounded-lg border transition duration-200 ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-pink-700 hover:bg-pink-800 text-white py-3 rounded-lg text-sm font-medium transition duration-200 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Column'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default AddColumnButton;