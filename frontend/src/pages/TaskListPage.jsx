import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getBoardById } from '../services/board';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';

const priorityColors = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-green-400',
};

const priorityBg = {
  high: 'bg-red-400/10',
  medium: 'bg-yellow-400/10',
  low: 'bg-green-400/10',
};

function TaskListPage() {
  const { isDark } = useTheme();
  const [searchParams] = useSearchParams();
  const boardId = searchParams.get('boardId');
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterDueDate, setFilterDueDate] = useState('');
  const [sortBy, setSortBy] = useState('');

  useEffect(() => {
    if (!boardId) return;
    const load = async () => {
      try {
        const b = await getBoardById(boardId);
        setBoard(b);
        setColumns(b.columns || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [boardId]);

  const allTasks = columns.flatMap(col =>
    (col.tasks || []).map(task => ({ ...task, status: col.title }))
  );

  const filtered = allTasks
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
    .filter(t => !filterPriority || t.priority === filterPriority)
    .filter(t => !filterStatus || t.status?.toLowerCase() === filterStatus.toLowerCase())
    .filter(t => !filterLabel || t.label === filterLabel)
    .filter(t => !filterStartDate || (t.startDate && t.startDate.split('T')[0] === filterStartDate))
    .filter(t => !filterDueDate || (t.dueDate && t.dueDate.split('T')[0] === filterDueDate))
    .sort((a, b) => {
      if (sortBy === 'dueDate') return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
      if (sortBy === 'priority') {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
      }
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });

  const inputClass = `px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200'}`;

  const hasFilters = search || filterPriority || filterStatus || filterLabel || filterStartDate || filterDueDate || sortBy;
  const clearAll = () => { setSearch(''); setFilterPriority(''); setFilterStatus(''); setFilterLabel(''); setFilterStartDate(''); setFilterDueDate(''); setSortBy(''); };

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <p className={`text-xl animate-pulse ${isDark ? 'text-white' : 'text-gray-700'}`}>Loading tasks...</p>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Navbar />

      <div className="max-w-6xl mx-auto w-full px-4 md:px-6 py-6">

        {/* Header */}
        <div className="mb-6">
          <Link to="/board" className={`text-xs transition duration-200 ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>
            ← Back to Board
          </Link>
          <h1 className={`text-xl md:text-2xl font-bold uppercase mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {board?.title} — Task List
          </h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {filtered.length} of {allTasks.length} tasks
          </p>
        </div>

        {/* Filters */}
        <div className={`flex flex-col gap-3 p-4 rounded-xl mb-6 ${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} w-full`}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={inputClass}>
              <option value="">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputClass}>
              <option value="">All statuses</option>
              {columns.map(col => (
                <option key={col._id} value={col.title}>{col.title}</option>
              ))}
            </select>
            <select value={filterLabel} onChange={(e) => setFilterLabel(e.target.value)} className={inputClass}>
              <option value="">All labels</option>
              <option value="Bug">Bug</option>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Documentation">Documentation</option>
              <option value="DevOps">DevOps</option>
              <option value="Design">Design</option>
              <option value="Testing">Testing</option>
              <option value="Feature">Feature</option>
              <option value="Other">Other</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={inputClass}>
              <option value="">Sort by...</option>
              <option value="dueDate">Due date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Start Date</label>
              <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Due Date</label>
              <input type="date" value={filterDueDate} onChange={(e) => setFilterDueDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          {hasFilters && (
            <button onClick={clearAll} className={`text-sm text-left transition duration-200 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              Clear ×
            </button>
          )}
        </div>

        {/* Table */}
        <div className={`rounded-xl overflow-x-auto border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className={`text-xs uppercase tracking-wider ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Label</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Assignee</th>
                <th className="px-4 py-3 text-left">Created by</th>
                <th className="px-4 py-3 text-left">Start date</th>
                <th className="px-4 py-3 text-left">Due date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className={`px-4 py-8 text-center text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    No tasks found.
                  </td>
                </tr>
              ) : (
                filtered.map((task, i) => (
                  <tr
                    key={task._id}
                    className={`border-t transition duration-150 ${isDark
                      ? `border-gray-700 ${i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/60'} hover:bg-gray-700`
                      : `border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {task.isDone && (
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                        <p className={`text-sm font-medium ${task.isDone ? 'line-through opacity-50' : ''} ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {task.title}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{task.description || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {task.label && task.label !== 'Other' ? (
                        <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{task.label}</span>
                      ) : (
                        <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{task.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${priorityColors[task.priority]} ${priorityBg[task.priority]}`}>{task.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      {task.assignedTo?.username ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-pink-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {task.assignedTo.username[0].toUpperCase()}
                          </div>
                          <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{task.assignedTo.username}</span>
                        </div>
                      ) : (
                        <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{task.createdBy?.username || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {task.startDate ? new Date(task.startDate).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {task.dueDate ? (
                        <span className={`text-xs font-medium ${new Date(task.dueDate) < new Date() && !task.isDone ? 'text-red-400' : isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TaskListPage;