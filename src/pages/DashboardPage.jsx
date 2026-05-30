import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';
import { getBoards, getBoardById } from '../services/board';

const PRIORITY_COLORS = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' };
const COLUMN_COLORS = ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#EC4899'];

function StatCard({ label, value, color, isDark }) {
  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-2 ${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-4xl font-bold ${color || (isDark ? 'text-white' : 'text-gray-900')}`}>{value}</span>
    </div>
  );
}

function DashboardPage() {
  const { isDark } = useTheme();
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
      if (data && data.length > 0) { setSelectedBoardId(data[0]._id); loadBoard(data[0]._id); }
      else setLoading(false);
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

  const handleBoardChange = (boardId) => { setSelectedBoardId(boardId); loadBoard(boardId); };

  const allTasks = columns.flatMap(col => col.tasks || []);
  const totalTasks = allTasks.length;
  const completedTasks = columns.filter(col => col.title.toLowerCase() === 'done').flatMap(col => col.tasks || []).length;
  const inProgressTasks = columns.filter(col => col.title.toLowerCase().includes('progress')).flatMap(col => col.tasks || []).length;
  const highPriorityTasks = allTasks.filter(t => t.priority === 'high').length;
const today = new Date(); today.setHours(0, 0, 0, 0);
  const xp = completedTasks * 10;
  const todayStr = today.toDateString();
  const completedToday = columns
    .filter(col => col.title.toLowerCase() === 'done')
    .flatMap(col => col.tasks || [])
    .filter(t => new Date(t.updatedAt).toDateString() === todayStr).length;
    
  const streak = completedToday > 0 ? 1 : 0;

  const priorityData = [
    { name: 'High', value: allTasks.filter(t => t.priority === 'high').length, color: '#EF4444' },
    { name: 'Medium', value: allTasks.filter(t => t.priority === 'medium').length, color: '#F59E0B' },
    { name: 'Low', value: allTasks.filter(t => t.priority === 'low').length, color: '#10B981' },
  ].filter(d => d.value > 0);

  const columnData = columns.map((col, i) => ({
    name: col.title,
    tasks: (col.tasks || []).length,
    color: COLUMN_COLORS[i % COLUMN_COLORS.length],
  }));

  
  const overdueTasks = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < today).length;
  const dueSoonTasks = allTasks.filter(t => {
    if (!t.dueDate) return false;
    const diff = (new Date(t.dueDate) - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  }).length;

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <p className={`text-xl animate-pulse ${isDark ? 'text-white' : 'text-gray-700'}`}>Loading dashboard...</p>
    </div>
  );

  if (error) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <p className="text-red-400 text-xl">{error}</p>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <Navbar />
      <div className="px-8 py-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Track your team's productivity</p>
          </div>
          <select
            value={selectedBoardId}
            onChange={(e) => handleBoardChange(e.target.value)}
            className={`px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${isDark ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 border border-gray-200'}`}
          >
            {boards.map(board => (
              <option key={board._id} value={board._id}>{board.title.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {totalTasks === 0 ? (
          <div className="flex flex-col items-center justify-center mt-32 gap-3">
            <p className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No tasks on this board yet</p>
            <p className={`text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Add tasks to see your dashboard stats</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Tasks" value={totalTasks} color={isDark ? 'text-white' : 'text-gray-900'} isDark={isDark} />
              <StatCard label="In Progress" value={inProgressTasks} color="text-pink-400" isDark={isDark} />
              <StatCard label="Completed" value={completedTasks} color="text-green-400" isDark={isDark} />
              <StatCard label="High Priority" value={highPriorityTasks} color="text-red-400" isDark={isDark} />
              <StatCard label="Overdue" value={overdueTasks} color="text-orange-400" isDark={isDark} />
              <StatCard label="Due Soon" value={dueSoonTasks} color="text-yellow-400" isDark={isDark} />
              <StatCard label="XP" value={xp} color="text-purple-400" isDark={isDark} />
              <StatCard label="Streak" value={`${streak} day${streak !== 1 ? 's' : ''}`} color="text-orange-400" isDark={isDark} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className={`rounded-2xl p-5 ${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
                <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Tasks per Column</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={columnData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#E5E7EB'} />
                    <XAxis dataKey="name" tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }} />
                    <YAxis tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12 }} allowDecimals={false} />
                    <Bar dataKey="tasks" radius={[6, 6, 0, 0]} isAnimationActive={false} activeBar={false}>
                      {columnData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className={`rounded-2xl p-5 ${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
                <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Tasks by Priority</h2>
                {priorityData.length === 0 ? (
                  <div className="flex items-center justify-center h-56">
                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No priority data</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={priorityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                        {priorityData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend formatter={(value) => (
                        <span style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: '12px' }}>{value}</span>
                      )} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className={`rounded-2xl p-5 ${isDark ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
              <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>All Tasks ({totalTasks})</h2>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${isDark ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'}`}>
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
                        <tr key={task._id} className={`border-b transition duration-150 ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}>
                          <td className={`py-3 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}</td>
                          <td className={`py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{col.title}</td>
                          <td className="py-3">
                            <span className={`text-xs font-medium flex items-center gap-1.5 ${task.priority === 'high' ? 'text-red-400' : task.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                              <span className={`inline-block w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                              {task.priority}
                            </span>
                          </td>
                          <td className={`py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{task.assignedTo?.username || '—'}</td>
                          <td className={`py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cards */}
              <div className="md:hidden flex flex-col gap-3">
                {columns.flatMap(col =>
                  (col.tasks || []).map(task => (
                    <div key={task._id} className={`rounded-xl p-3 border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title}</p>
                        <span className={`text-xs font-medium flex items-center gap-1 flex-shrink-0 ${task.priority === 'high' ? 'text-red-400' : task.priority === 'medium' ? 'text-yellow-400' : 'text-green-400'}`}>
                          <span className={`inline-block w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{col.title}</span>
                        {task.dueDate && (
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


export default DashboardPage;