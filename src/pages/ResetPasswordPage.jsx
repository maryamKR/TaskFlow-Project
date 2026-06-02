import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/auth';

function ResetPasswordPage() {
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) { setError('Password is required'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center justify-center h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className={`p-8 rounded-2xl shadow-lg w-full max-w-md ${isDark ? 'bg-gray-800' : 'bg-white'}`}>

        <h1 className={`text-3xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>TaskFlow</h1>
        <p className={`text-center mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Set a new password</p>

        {success ? (
          <div className="text-center">
            <p className="text-green-400 text-sm">Password reset successfully! Redirecting...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div>
              <label className={`text-sm mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                  isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>

            <div>
              <label className={`text-sm mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                  isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-700 hover:bg-pink-800 text-white font-semibold py-3 rounded-lg transition duration-200 mt-2 disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

          </form>
        )}

      </div>
    </div>
  );
}

export default ResetPasswordPage;