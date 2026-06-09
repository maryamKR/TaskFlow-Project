import { useState } from 'react';
import { deleteBoard, inviteMember, removeMember } from '../services/board';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Toast from './Toast';

function Sidebar({
  boards, activeBoard, members, onBoardSelect, onBoardCreated,
  onBoardDeleted, onMemberRemoved, onInviteSent, setShowCreateModal,
}) {
  const { isDark } = useTheme();
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [boardToDelete, setBoardToDelete] = useState(null);

  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;
  const isOwner = activeBoard?.user === currentUserId || activeBoard?.user?._id === currentUserId;

  const handleDeleteBoard = async () => {
    if (!isOwner) {
      setToast({ message: 'Only the board owner can delete a board.', type: 'error' });
      return;
    }
    setDeletingId(boardToDelete._id);
    try {
      await deleteBoard(boardToDelete._id);
      onBoardDeleted(boardToDelete._id);
    } catch (err) {
      console.error('Failed to delete board:', err);
    } finally {
      setDeletingId(null);
      setBoardToDelete(null);
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
      setInviteSuccess(`${inviteEmail} invited!`);
      setInviteEmail('');
      onInviteSent(activeBoard._id);
    } catch (err) {
      setInviteError(err.response?.data?.error || 'Failed to invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!isOwner) {
      setToast({ message: 'Only the board owner can remove members.', type: 'error' });
      return;
    }
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
    <div className={`w-64 min-h-screen border-r flex flex-col ${isDark ? 'bg-[#0f1117] border-gray-700' : 'bg-gray-100 border-gray-300'}`}>
      <div className="p-4 flex-1 overflow-y-auto">

        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Boards</span>
          <button
            onClick={() => setShowCreateModal(true)}
            className={`text-lg leading-none transition duration-200 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
            title="New board"
          >+</button>
        </div>

        <div className="flex flex-col gap-1 mb-6">
          {boards.map(board => (
            <div
              key={board._id}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition duration-200 ${activeBoard?._id === board._id
                ? 'bg-pink-700 text-white'
                : isDark
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                }`}
              onClick={() => onBoardSelect(board._id)}
            >
              <span className="text-sm font-medium truncate">{board.title}</span>
              {activeBoard?._id === board._id && (
                <button
                  onClick={(e) => { e.stopPropagation(); setBoardToDelete(board); }}
                  disabled={deletingId === board._id}
                  className="opacity-0 group-hover:opacity-100 text-pink-200 hover:text-red-300 text-xs font-bold transition duration-200 ml-1"
                >
                  {deletingId === board._id ? '·' : '×'}
                </button>
              )}
            </div>
          ))}
          {boards.length === 0 && (
            <p className={`text-xs px-3 ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>No boards yet</p>
          )}
        </div>

        {activeBoard && (
          <div className={`border-t pt-4 ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>

            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Team</span>
              <button
                onClick={() => setShowMembers(prev => !prev)}
                className={`text-xs transition duration-200 ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {showMembers ? 'Hide' : 'Show'}
              </button>
            </div>

            {showMembers && (
              <div className="flex flex-col gap-2 mb-3">
                {members.length === 0 ? (
                  <p className={`text-xs px-1 ${isDark ? 'text-gray-600' : 'text-gray-500'}`}>No members yet</p>
                ) : (
                  members.map(member => {
                    const memberIsOwner = member._id === activeBoard?.user?._id || member._id === activeBoard?.user;
                    return (
                      <div key={member._id} className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-6 h-6 rounded-full bg-pink-700 flex items-center justify-center text-white text-xs font-bold">
                              {member.username[0].toUpperCase()}
                            </div>
                            <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${member.isOnline ? 'bg-green-400' : isDark ? 'bg-gray-600' : 'bg-gray-400'}`} />
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{member.username}</span>
                            <span className={`text-xs px-1.5 py-0 rounded-full w-fit ${memberIsOwner ? 'bg-pink-700/20 text-pink-400' : isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-600'}`}>
                              {memberIsOwner ? 'Owner' : 'Coworker'}
                            </span>
                          </div>
                        </div>
                        {!memberIsOwner && (
                          <button
                            onClick={() => handleRemoveMember(member._id)}
                            disabled={removingId === member._id}
                            className={`text-xs transition duration-200 ${isDark ? 'text-gray-600 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
                          >
                            {removingId === member._id ? '·' : '×'}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {isOwner && (
              <>
                <button
                  onClick={() => setShowInvite(prev => !prev)}
                  className={`w-full text-left text-xs py-1.5 px-1 transition duration-200 flex items-center gap-2 ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
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
                      className={`w-full px-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-pink-500 ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-500 border border-gray-300'}`}
                    />
                    {inviteError && (
                      <div className="flex items-center justify-between">
                        <p className="text-red-400 text-xs">{inviteError}</p>
                        <button
                          type="button"
                          onClick={() => { setShowInvite(false); setInviteEmail(''); setInviteError(''); }}
                          className={`text-xs transition duration-200 ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {inviteSuccess && <p className="text-green-500 text-xs">{inviteSuccess}</p>}
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="w-full bg-pink-700 hover:bg-pink-800 text-white py-1.5 rounded-lg text-xs font-medium transition duration-200 disabled:opacity-50"
                    >
                      {inviteLoading ? 'Inviting...' : 'Send Invite'}
                    </button>
                  </form>
                )}
              </>
            )}

            <div className={`border-t pt-3 mt-3 ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>

              <a
                href={`/board/tasks?boardId=${activeBoard._id}`}
                className={`flex items-center gap-2 px-1 py-1.5 rounded-lg text-xs transition duration-200 ${isDark ? 'text-gray-500 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
              >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
              </svg>
              Task List View
            </a>
          </div>

          </div>
        )}
    </div>

      {
    boardToDelete && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`rounded-2xl p-6 w-80 shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-sm font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Delete Board</h3>
          <p className={`text-xs mb-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Delete "<span className="font-medium">{boardToDelete.title}</span>" and all its data? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setBoardToDelete(null)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition duration-200 ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              Cancel
            </button>
            <button onClick={handleDeleteBoard} disabled={deletingId === boardToDelete._id} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition duration-200 disabled:opacity-50">
              {deletingId === boardToDelete._id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  { toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> }
    </div >
  );
}

export default Sidebar;