import { useTheme } from '../context/ThemeContext';

function FilterPanel({ show, onClose, onClear, children }) {
  const { isDark } = useTheme();
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className={`absolute top-0 right-0 bottom-0 w-72 flex flex-col shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`flex items-center justify-between px-4 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-gray-900'}`}>Filters</h3>
          <button onClick={onClose} className={`text-xl leading-none ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
          {children}
        </div>
        <div className={`px-4 py-4 border-t flex gap-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => { onClear(); onClose(); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition duration-200 ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-pink-700 hover:bg-pink-800 text-white transition duration-200"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilterPanel;