import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import Navbar from '../components/Navbar';
import { getBoards, getBoardById } from '../services/board';

const PRIORITY_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

const COLUMN_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899'];

function StatCard({ label, value, color }) {
  return (
    <div className="bg-gray-800 rounded-2xl p-5 flex flex-col gap-2">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-4xl font-bold ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}

function DashboardPage() {
  const [boards, setBoards] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    fetchBoards();
  }, [token]);

  const fetchBoards = async () => {
    try {
      const data = await getBoards();
      setBoards(data || []);
      if (data && data.length > 0) {
        setSelectedBoardId(data[0]._id);
        loadBoard(data[0]._id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError('Cannot connect to server.');
      setLoading(false);
    }
  };

  const loadBoard = async (boardId) => {
    setLoading(true);
    try {
      const board = await getBoardById(boardId);
      setColumns(board.columns || []);
    } catch (err) {
      setError('Failed to load board.');
    } finally {
      setLoading(false);
    }
  };

  const handleBoardChange = (boardId) => {
    setSelectedBoardId(boardId);
    loadBoard(boardId);
  };

  // ── Compute stats ──────────────────────
  const allTasks = columns.flatMap(col => col.tasks || []);
  const totalTasks = allTasks.length;
  const completedTasks = columns
    .filter(col => col.title.toLowerCase() === 'done')
    .flatMap(col => col.tasks || []).length;
  const inProgressTasks = columns
    .filter(col => col.title.toLowerCase().includes('progress'))
    .flatMap(col => col.tasks || []).length;
  const highPriorityTasks = allTasks.filter(t => t.priority === 'high').length;

  // Priority chart data
  const priorityData = [
    { name: 'High', value: allTasks.filter(t => t.priority === 'high').length, color: '#EF4444' },
    { name: 'Medium', value: allTasks.filter(t => t.priority === 'medium').length, color: '#F59E0B' },
    { name: 'Low', value: allTasks.filter(t => t.priority === 'low').length, color: '#10B981' },
  ].filter(d => d.value > 0);

  // Tasks per column chart data
  const columnData = columns.map((col, i) => ({
    name: col.title,
    tasks: (col.tasks || []).length,
    color: COLUMN_COLORS[i % COLUMN_COLORS.length],
  }));

  // Due date stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueTasks = allTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < today;
  }).length;

  const dueSoonTasks = allTasks.filter(t => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    const diff = (due - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  }).length;

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white text-xl animate-pulse">Loading dashboard...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-red-400 text-xl">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />

      <div className="px-8 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Track your team's productivity</p>
          </div>

          {/* Board selector */}
          <select
            value={selectedBoardId}
            onChange={(e) => handleBoardChange(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {boards.map(board => (
              <option key={board._id} value={board._id}>
                {board.title}
              </option>
            ))}
          </select>
        </div>

        {totalTasks === 0 ? (
          <div className="flex flex-col items-center justify-center mt-32 gap-3">
            <p className="text-gray-400 text-xl">No tasks on this board yet</p>
            <p className="text-gray-600 text-sm">Add tasks to see your dashboard stats</p>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              <StatCard label="Total Tasks" value={totalTasks} color="text-white" />
              <StatCard label="In Progress" value={inProgressTasks} color="text-blue-400" />
              <StatCard label="Completed" value={completedTasks} color="text-green-400" />
              <StatCard label="High Priority" value={highPriorityTasks} color="text-red-400" />
              <StatCard label="Overdue" value={overdueTasks} color="text-orange-400" />
              <StatCard label="Due Soon" value={dueSoonTasks} color="text-yellow-400" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

              {/* Tasks per column bar chart */}
              <div className="bg-gray-800 rounded-2xl p-5">
                <h2 className="text-white font-semibold mb-4">Tasks per Column</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={columnData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#F9FAFB' }}
                      itemStyle={{ color: '#9CA3AF' }}
                    />
                    <Bar dataKey="tasks" radius={[6, 6, 0, 0]}>
                      {columnData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Priority pie chart */}
              <div className="bg-gray-800 rounded-2xl p-5">
                <h2 className="text-white font-semibold mb-4">Tasks by Priority</h2>
                {priorityData.length === 0 ? (
                  <div className="flex items-center justify-center h-56">
                    <p className="text-gray-500 text-sm">No priority data</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#F9FAFB' }}
                        itemStyle={{ color: '#9CA3AF' }}
                      />
                      <Legend
                        formatter={(value) => (
                          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Task list — all tasks */}
            <div className="bg-gray-800 rounded-2xl p-5">
              <h2 className="text-white font-semibold mb-4">
                All Tasks ({totalTasks})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left pb-3 font-medium">Title</th>
                      <th className="text-left pb-3 font-medium">Column</th>
                      <th className="text-left pb-3 font-medium">Priority</th>
                      <th className="text-left pb-3 font-medium">Assignee</th>
                      <th className="text-left pb-3 font-medium">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.flatMap(col =>
                      (col.tasks || []).map(task => (
                        <tr
                          key={task._id}
                          className="border-b border-gray-700 hover:bg-gray-700 transition duration-150"
                        >
                          <td className="py-3 text-white font-medium">{task.title}</td>
                          <td className="py-3 text-gray-400">{col.title}</td>
                          <td className="py-3">
                            <span className={`text-xs font-medium ${
                              task.priority === 'high' ? 'text-red-400' :
                              task.priority === 'medium' ? 'text-yellow-400' :
                              'text-green-400'
                            }`}>
                              {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'} {task.priority}
                            </span>
                          </td>
                          <td className="py-3 text-gray-400">
                            {task.assignedTo?.username || '—'}
                          </td>
                          <td className="py-3 text-gray-400">
                            {task.dueDate
                              ? new Date(task.dueDate).toLocaleDateString()
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;