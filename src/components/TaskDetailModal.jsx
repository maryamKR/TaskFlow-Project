import { useState, useEffect } from 'react';
import { updateTask, getComments, addComment, deleteComment } from '../services/board';
import { useTheme } from '../context/ThemeContext';

function TaskDetailModal({ task, members, onClose, onTaskUpdated }) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'low');
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '');
  const [assignee, setAssignee] = useState(task.assignedTo?._id || task.assignedTo || '');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchComments(); }, []);

  const fetchComments = async () => {
    setCommentLoading(true);
    try {
      const data = await getComments(task._id);
      setComments(data || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await updateTask(task._id, {
        title, description, priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        assignedTo: assignee || null,
      });
      onTaskUpdated(task._id, updated);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      const comment = await addComment(task._id, newComment);
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const inputClass = `w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'
  }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl w-full max-w-3xl shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>

        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Task Details</h2>
          <button onClick={onClose} className={`text-2xl leading-none ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>×</button>
        </div>

        <div className="grid grid-cols-2 gap-0 max-h-[75vh]">

          {/* Left — Edit form */}
          <div className={`p-5 flex flex-col gap-3 border-r overflow-y-auto ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Edit Task</h3>

            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`${inputClass} ${error ? 'ring-2 ring-red-500' : ''}`}
              />
              {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            </div>

            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Assignee</label>
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={inputClass}>
                <option value="">Unassigned</option>
                {members.map(member => (
                  <option key={member._id} value={member._id}>{member.username}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200 disabled:opacity-50 text-sm mt-1"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Right — Comments */}
          <div className="p-5 flex flex-col overflow-y-auto">
            <h3 className={`text-xs font-medium uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Comments {comments.length > 0 && `(${comments.length})`}
            </h3>

            <div className="flex flex-col gap-2 flex-1 overflow-y-auto mb-3">
              {commentLoading ? (
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading...</p>
              ) : comments.length === 0 ? (
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No comments yet.</p>
              ) : (
                comments.map(comment => (
                  <div key={comment._id} className={`rounded-xl p-3 flex items-start justify-between gap-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="flex gap-2 flex-1">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {comment.author?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {comment.author?.username || 'Unknown'}
                          </span>
                          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{comment.content}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      className={`text-sm font-bold flex-shrink-0 ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                    >×</button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2 mt-auto">
              <input
                type="text"
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'
                }`}
              />
              <button
                type="submit"
                disabled={loading || !newComment.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition duration-200 disabled:opacity-50"
              >
                {loading ? '...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailModal;