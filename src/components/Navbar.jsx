import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  getNotifications,
  markAllRead,
  markOneRead,
  deleteNotification,
  deleteReadNotifications
} from '../services/board';

function Navbar() {
  // 1. Token first
  const token = localStorage.getItem('token');
  const { isDark, toggleTheme } = useTheme();

  // 2. Get username from token
  const getUsername = () => {
    const username = localStorage.getItem('username') || 'User';
    return username.charAt(0).toUpperCase() + username.slice(1);
  };
  const username = getUsername();

  // 3. State
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // 4. Fetch notifications + polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // 5. Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      console.log('Raw notifications response:', data);
      setNotifications(data || []);
    } catch (err) {
      console.error('Notifications error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleMarkOneRead = async (id) => {
    try {
      await markOneRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleDeleteOne = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleDeleteRead = async () => {
    try {
      await deleteReadNotifications();
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (err) {
      console.error('Failed to delete read notifications:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/';
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <nav className={`border-b px-6 py-4 flex items-center justify-between ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>

      {/* Left — Logo */}
      <div className="flex items-center gap-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon
            points="13,2 4,14 11,14 11,22 20,10 13,10"
            fill="#3B82F6"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-white text-xl font-bold">TaskFlow</span>
      </div>

      {/* Center — Navigation Links */}
      <div className="flex items-center gap-6">
        <Link
          to="/board"
          className={`transition duration-200 text-sm font-medium ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
        >
          Board
        </Link>
        <Link
          to="/dashboard"
          className={`transition duration-200 text-sm font-medium ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
            }`}
        >
          Dashboard
        </Link>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition duration-200 ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* 🔔 Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(prev => !prev)}
            className="relative text-gray-400 hover:text-white transition duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 top-10 w-80 bg-gray-800 border border-gray-700 rounded-2xl shadow-xl z-50">

              {/* Dropdown header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <span className="text-white font-semibold text-sm">
                  Notifications {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
                      {unreadCount}
                    </span>
                  )}
                </span>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.some(n => n.isRead) && (
                    <button
                      onClick={handleDeleteRead}
                      className="text-gray-500 hover:text-red-400 text-xs"
                    >
                      Clear read
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications list */}
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-gray-500 text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div
                      key={notification._id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-gray-700 last:border-0 ${!notification.isRead ? 'bg-gray-750' : ''
                        }`}
                    >
                      {/* Unread dot */}
                      <div className="mt-1.5 flex-shrink-0">
                        {!notification.isRead ? (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-transparent" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 text-xs leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkOneRead(notification._id)}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                            title="Mark as read"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteOne(notification._id)}
                          className="text-gray-500 hover:text-red-400 text-xs font-bold"
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
          {username[0].toUpperCase()}
        </div>

        {/* Username */}
        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {username.charAt(0).toUpperCase() + username.slice(1)}
        </span>

        <button
          onClick={handleLogout}
          className={`text-sm transition duration-200 ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'
            }`}
        >
          Logout
        </button>
      </div>

    </nav>
  );
}

export default Navbar;