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

      {/* Right */}
      <div className="flex items-center gap-4">

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
                      className={`flex items-start gap-3 px-4 py-3 border-b border-gray-700 last:border-0 ${
                        !notification.isRead ? 'bg-gray-750' : ''
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
        <span className="text-gray-300 text-sm">{username}</span>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-400 text-sm transition duration-200"
        >
          Logout
        </button>
      </div>

    </nav>
  );
}

export default Navbar;