import { useState } from 'react';
import { inviteMember, getBoardMembers } from '../services/board';

function InviteMemberModal({ boardId, onClose, onMembersUpdated }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await inviteMember(boardId, email);
      setSuccess(`✅ ${email} added to the board!`);
      setEmail('');

      // refresh members list
      const updatedMembers = await getBoardMembers(boardId);
      onMembersUpdated(Array.isArray(updatedMembers) ? updatedMembers : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">👥 Invite Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-gray-300 text-sm mb-1 block">
              Member Email
            </label>
            <input
              type="email"
              placeholder="e.g. asmaa@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              className={`w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                error ? 'ring-2 ring-red-500' : 'focus:ring-pink-500'
              }`}
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            {success && <p className="text-green-400 text-xs mt-1">{success}</p>}
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition duration-200"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-lg bg-pink-700 hover:bg-pink-800 text-white font-semibold transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Member ✓'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InviteMemberModal;