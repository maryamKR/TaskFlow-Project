import { useState } from 'react';
import { removeMember } from '../services/board';

function ManageMembersModal({ boardId, members, onClose, onMemberRemoved }) {
  const [removing, setRemoving] = useState(null);

  const handleRemove = async (memberId) => {
    setRemoving(memberId);
    try {
      await removeMember(boardId, memberId);
      onMemberRemoved(memberId);
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">👥 Board Members</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Members list */}
        {members.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No members yet. Invite someone!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map(member => (
              <div
                key={member._id}
                className="flex items-center justify-between bg-gray-700 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    {member.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{member.username}</p>
                    <p className="text-gray-400 text-xs">{member.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(member._id)}
                  disabled={removing === member._id}
                  className="text-gray-500 hover:text-red-400 text-xs font-medium transition duration-200 disabled:opacity-50"
                >
                  {removing === member._id ? '...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition duration-200 text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default ManageMembersModal;