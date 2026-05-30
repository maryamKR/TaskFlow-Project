import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

function Toast({ message, type = 'error', onClose }) {
  const { isDark } = useTheme();

  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    success: 'bg-green-500',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium animate-fade-in ${colors[type]}`}>
      <span>
        {type === 'error' ? '✕' : type === 'warning' ? '⚠' : '✓'}
      </span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 text-lg leading-none">×</button>
    </div>
  );
}

export default Toast;