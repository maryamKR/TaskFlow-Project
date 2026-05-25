import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getProfileFromStorage, getMyBoards } from '../services/profile';

function ProfilePage() {
  const [profile] = useState(getProfileFromStorage());
  const [boards, setBoards] = useState([]);
  const [stats, setStats] = useState({
    totalBoards: 0,
    totalTasks: 0,
    completedTasks: 0,
    highPriorityTasks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/'; return; }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const boardsData = await getMyBoards();
      setBoards(boardsData);

      let totalTasks = 0;
      let completedTasks = 0;
      let highPriorityTasks = 0;

      boardsData.forEach(board => {
        (board.columns || []).forEach(col => {
          (col.tasks || []).forEach(task => {
            totalTasks++;
            if (col.title?.toLowerCase() === 'done') completedTasks++;
            if (task.priority === 'high') highPriorityTasks++;
          });
        });
      });

      setStats({
        totalBoards: boardsData.length,
        totalTasks,
        completedTasks,
        highPriorityTasks,
      });
    } catch (err) {
      console.error('Failed to load profile stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const initials = profile.username
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white text-xl animate-pulse">Loading profile...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Navbar />

      <div className="max-w-3xl mx-auto w-full px-6 py-10 flex flex-col gap-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-gray-400 text-sm mt-1">Your account information and activity</p>
        </div>

        {/* Avatar + Info card */}
        <div className="bg-gray-800 rounded-2xl p-6 flex items-center gap-6 border border-gray-700">
          <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-white text-xl font-bold">{profile.username}</h2>
            <p className="text-gray-400 text-sm">{profile.email || 'No email saved'}</p>
            <span className="mt-2 inline-block bg-blue-600/20 text-blue-400 text-xs px-3 py-1 rounded-full w-fit">
              Member
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Boards', value: stats.totalBoards, color: 'text-blue-400' },
            { label: 'Total Tasks', value: stats.totalTasks, color: 'text-white' },
            { label: 'Completed', value: stats.completedTasks, color: 'text-green-400' },
            { label: 'High Priority', value: stats.highPriorityTasks, color: 'text-red-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-800 rounded-2xl p-5 border border-gray-700 flex flex-col gap-1">
              <p className="text-gray-400 text-xs">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Boards list */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-white font-semibold">My Boards ({boards.length})</h3>
          </div>
          <div className="divide-y divide-gray-700">
            {boards.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500 text-sm">No boards yet</p>
                <Link to="/board" className="text-blue-400 text-sm hover:underline mt-1 inline-block">
                  Create your first board →
                </Link>
              </div>
            ) : (
              boards.map(board => {
                const taskCount = (board.columns || [])
                  .reduce((acc, col) => acc + (col.tasks || []).length, 0);
                const doneCount = (board.columns || [])
                  .filter(col => col.title?.toLowerCase() === 'done')
                  .reduce((acc, col) => acc + (col.tasks || []).length, 0);

                return (
                  <div key={board._id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{board.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {taskCount} tasks · {doneCount} done
                      </p>
                    </div>
                    <Link
                      to="/board"
                      className="text-blue-400 hover:text-blue-300 text-xs transition duration-200"
                    >
                      Open →
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Logout */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">Sign out</p>
            <p className="text-gray-500 text-xs mt-0.5">Log out of your account</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('username');
              localStorage.removeItem('email');
              window.location.href = '/';
            }}
            className="bg-red-600/20 hover:bg-red-600/40 text-red-400 px-4 py-2 rounded-lg text-sm transition duration-200"
          >
            Logout
          </button>
        </div>

      </div>
    </div>
  );
}

export default ProfilePage;