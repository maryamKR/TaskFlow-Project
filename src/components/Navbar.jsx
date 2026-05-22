import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">

      {/* Left — Logo */}
      <div className="flex items-center gap-3">
        <span className="text-blue-500 text-2xl font-bold">⚡</span>
        <span className="text-white text-xl font-bold">TaskFlow</span>
      </div>

      {/* Center — Navigation Links */}
      <div className="flex items-center gap-6">
        <Link
          to="/board"
          className="text-gray-400 hover:text-white transition duration-200 text-sm font-medium"
        >
          Board
        </Link>
        <Link
          to="/dashboard"
          className="text-gray-400 hover:text-white transition duration-200 text-sm font-medium"
        >
          Dashboard
        </Link>
      </div>

      {/* Right — User info */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
          S
        </div>
        <span className="text-gray-300 text-sm">Selma</span>
        <button className="text-gray-400 hover:text-red-400 text-sm transition duration-200 ml-2">
          Logout
        </button>
      </div>

    </nav>
  );
}

export default Navbar;