import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/auth';

function ForgotPasswordPage() {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center justify-center h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className={`p-8 rounded-2xl shadow-lg w-full max-w-md ${isDark ? 'bg-gray-800' : 'bg-white'}`}>

        <h1 className={`text-3xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>TaskFlow</h1>
        <p className={`text-center mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Reset your password</p>

        {success ? (
          <div className="text-center flex flex-col gap-4">
            <p className="text-green-400 text-sm">
              If this email is registered, a reset link has been sent.
            </p>
            <a href="/" className="text-pink-400 hover:underline text-sm">
              Back to Sign In
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className={`text-sm mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
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
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className={`text-center mt-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Remember your password?{' '}
          <a href="/" className="text-pink-400 hover:underline">Sign in</a>
        </p>

      </div>
    </div>
  );
}

export default ForgotPasswordPage;