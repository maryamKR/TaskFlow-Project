import { useState } from 'react';
import { createColumn } from '../services/board';

function AddColumnButton({ boardId, onColumnAdded }) {
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
      className="flex-shrink-0 w-72 h-12 rounded-2xl border-2 border-dashed border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400 transition duration-200 flex items-center justify-center gap-2"
    >
      + Add Column
    </button>
  );

  return (
    <div className="bg-gray-800 rounded-2xl p-4 w-72 flex-shrink-0">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Column name..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className={`w-full px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
            error ? 'ring-2 ring-red-500' : 'focus:ring-blue-500'
          }`}
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Column'}
          </button>
          <button
            type="button"
            onClick={() => { setIsOpen(false); setTitle(''); setError(''); }}
            className="px-3 py-2 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700 transition duration-200"
          >
            ✕
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddColumnButton;