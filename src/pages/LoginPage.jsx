import { useState } from 'react';
import { login } from '../services/auth';
import { useTheme } from '../context/ThemeContext';

function LoginPage() {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setLoading(true);
    try {
      await login(email, password);
      window.location.href = '/board';
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Login failed';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center justify-center h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className={`p-8 rounded-2xl shadow-lg w-full max-w-md ${isDark ? 'bg-gray-800' : 'bg-white'}`}>

        <h1 className={`text-3xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>TaskFlow</h1>
        <p className={`text-center mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sign in to your account</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div>
            <label className={`text-sm mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                errors.email ? 'ring-2 ring-red-500' : 'focus:ring-blue-500'
              } ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'}`}
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className={`text-sm mb-1 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${
                errors.password ? 'ring-2 ring-red-500' : 'focus:ring-blue-500'
              } ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'}`}
            />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
          </div>

          {errors.general && <p className="text-red-400 text-sm text-center">{errors.general}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 mt-2 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        <p className={`text-center mt-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Don't have an account?{' '}
          <a href="/register" className="text-blue-400 hover:underline">Sign up</a>
        </p>

      </div>
    </div>
  );
}

export default LoginPage;