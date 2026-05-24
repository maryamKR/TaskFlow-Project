import { useState } from 'react';
import { deleteBoard, inviteMember, removeMember } from '../services/board';

function Sidebar({
  boards,
  activeBoard,
  members,
  onBoardSelect,
  onBoardCreated,
  onBoardDeleted,
  onMemberRemoved,
  onInviteSent,
  setShowCreateModal,
}) {
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteBoard = async (board) => {
    if (!window.confirm(`Delete "${board.title}" and all its data?`)) return;
    setDeletingId(board._id);
    try {
      await deleteBoard(board._id);
      onBoardDeleted(board._id);
    } catch (err) {
      console.error('Failed to delete board:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      await inviteMember(activeBoard._id, inviteEmail);
      setInviteSuccess(`✅ ${inviteEmail} invited!`);
      setInviteEmail('');
      onInviteSent(activeBoard._id);
    } catch (err) {
      setInviteError(err.response?.data?.error || 'Failed to invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    setRemovingId(memberId);
    try {
      await removeMember(activeBoard._id, memberId);
      onMemberRemoved(memberId);
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="w-64 min-h-screen bg-gray-850 border-r border-gray-700 flex flex-col"
      style={{ backgroundColor: '#0f1117' }}>

      {/* Boards section */}
      <div className="p-4 flex-1 overflow-y-auto">

        {/* Boards header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
            Boards
          </span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-gray-400 hover:text-white text-lg leading-none transition duration-200"
            title="New board"
          >
            +
          </button>
        </div>

        {/* Board list */}
        <div className="flex flex-col gap-1 mb-6">
          {boards.map(board => (
            <div
              key={board._id}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition duration-200 ${
                activeBoard?._id === board._id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => onBoardSelect(board._id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{board.title}</span>
              </div>
              {activeBoard?._id === board._id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBoard(board);
                  }}
                  disabled={deletingId === board._id}
                  className="opacity-0 group-hover:opacity-100 text-blue-200 hover:text-red-300 text-xs font-bold transition duration-200 ml-1"
                >
                  {deletingId === board._id ? '·' : '×'}
                </button>
              )}
            </div>
          ))}

          {boards.length === 0 && (
            <p className="text-gray-600 text-xs px-3">No boards yet</p>
          )}
        </div>

        {/* Team section */}
        {activeBoard && (
          <>
            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  Team
                </span>
                <button
                  onClick={() => setShowMembers(prev => !prev)}
                  className="text-gray-500 hover:text-white text-xs transition duration-200"
                >
                  {showMembers ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Members list */}
              {showMembers && (
                <div className="flex flex-col gap-2 mb-3">
                  {members.length === 0 ? (
                    <p className="text-gray-600 text-xs px-1">No members yet</p>
                  ) : (
                    members.map(member => (
                      <div
                        key={member._id}
                        className="flex items-center justify-between px-1"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {member.username[0].toUpperCase()}
                          </div>
                          <span className="text-gray-300 text-xs">{member.username}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          disabled={removingId === member._id}
                          className="text-gray-600 hover:text-red-400 text-xs transition duration-200"
                        >
                          {removingId === member._id ? '·' : '×'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Invite section */}
              <button
                onClick={() => setShowInvite(prev => !prev)}
                className="w-full text-left text-gray-500 hover:text-white text-xs py-1.5 px-1 transition duration-200 flex items-center gap-2"
              >
                <span>+</span>
                <span>Invite member</span>
              </button>

              {showInvite && (
                <form onSubmit={handleInvite} className="mt-2 flex flex-col gap-2">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {inviteError && <p className="text-red-400 text-xs">{inviteError}</p>}
                  {inviteSuccess && <p className="text-green-400 text-xs">{inviteSuccess}</p>}
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg text-xs font-medium transition duration-200 disabled:opacity-50"
                  >
                    {inviteLoading ? 'Inviting...' : 'Send Invite'}
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Sidebar;