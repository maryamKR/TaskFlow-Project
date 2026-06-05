import { useState, useEffect } from 'react';
import socket from '../socket';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, horizontalListSortingStrategy, arrayMove, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Column from '../components/Column';
import CreateBoardModal from '../components/CreateBoardModal';
import AddColumnButton from '../components/AddColumnButton';
import { useTheme } from '../context/ThemeContext';
import {
  getBoards, getBoardById, getBoardMembers,
  moveTask, reorderColumns, reorderTasks
} from '../services/board';
import AiBanner from '../components/AiBanner';
const normalizeTasks = (cols) =>
  cols.map(col => ({
    ...col,
    tasks: (col.tasks || []).map(t => ({ ...t, id: t._id }))
  }));

function SortableColumnWrapper({ column, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column._id,
    data: { type: 'column' },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex-1 min-w-[280px]">
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}
function BoardPage() {
  const { isDark } = useTheme();
  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeType, setActiveType] = useState(null);
  const [filter, setFilter] = useState({
    priority: '',
    search: '',
    assignee: '',
    startDate: '',
    dueDate: '',
    label: ''
  });
  const [dragSourceColId, setDragSourceColId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }));

  const token = localStorage.getItem('token');
  const tokenPayload = token ? JSON.parse(atob(token.split('.')[1])) : null;
  const currentUserId = tokenPayload?.id || tokenPayload?._id || tokenPayload?.userId;
  const isOwner = activeBoard?.user === currentUserId || activeBoard?.user?._id === currentUserId;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!token) { window.location.href = '/'; return; }
    fetchBoards();
  }, [token]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      socket.auth = { token };
      socket.connect();
      socket.emit("join_user", currentUserId);
    }

    socket.on("board_invite_accepted", ({ board }) => {
      setBoards(prev => {
        if (prev.some(b => b._id === board._id)) return prev;
        return [...prev, board];
      });
    });

    return () => {
      socket.off("board_invite_accepted");
    };
  }, []);

  useEffect(() => {
    if (!activeBoard) return;

    socket.emit("join_board", { boardId: activeBoard._id, userId: currentUserId });

    socket.on("task_moved", ({ taskId, sourceColumnId, destinationColumnId }) => {
      setColumns(prev => {
        const task = prev
          .find(col => col._id === sourceColumnId)
          ?.tasks.find(t => t._id === taskId || t.id === taskId);
        if (!task) return prev;

        // Check if destination is Done column
        const destCol = prev.find(col => col._id === destinationColumnId);
        const isDone = destCol?.title?.toLowerCase() === 'done';

        return prev.map(col => {
          if (col._id === sourceColumnId)
            return { ...col, tasks: col.tasks.filter(t => t._id !== taskId && t.id !== taskId) };
          if (col._id === destinationColumnId)
            return { ...col, tasks: [...col.tasks, { ...task, isDone }] };
          return col;
        });
      });
    });

    socket.on("columns_reordered", ({ columnIds }) => {
      setColumns(prev => {
        const reordered = columnIds
          .map(id => prev.find(col => col._id === id))
          .filter(Boolean);
        return reordered.length === prev.length ? reordered : prev;
      });
    });

    socket.on("column_added", ({ column }) => {
      setColumns(prev => [...prev, { ...column, tasks: [] }]);
    });

    socket.on("column_deleted", ({ columnId }) => {
      setColumns(prev => prev.filter(col => col._id !== columnId));
    });

    socket.on("tasks_reordered", ({ columnId, taskIds }) => {
      setColumns(prev => prev.map(col => {
        if (col._id !== columnId) return col;
        const reordered = taskIds
          .map(id => col.tasks.find(t => t._id === id || t.id === id))
          .filter(Boolean);
        return { ...col, tasks: reordered };
      }));
    });

    socket.on("task_created", ({ columnId, task, createdBy }) => {
      if (createdBy === currentUserId) return;
      setColumns(prev => prev.map(col =>
        col._id === columnId
          ? { ...col, tasks: [...col.tasks, { ...task, id: task._id }] }
          : col
      ));
    });

    socket.on("task_updated", ({ taskId, updatedTask }) => {
      setColumns(prev => prev.map(col => ({
        ...col,
        tasks: col.tasks.map(t =>
          t._id === taskId ? { ...t, ...updatedTask, id: taskId } : t
        )
      })));
    });

    socket.on("task_deleted", ({ taskId, columnId }) => {
      setColumns(prev => prev.map(col =>
        col._id === columnId
          ? { ...col, tasks: col.tasks.filter(t => t._id !== taskId && t.id !== taskId) }
          : col
      ));
    });

    socket.on("member_online", ({ userId }) => {
      setMembers(prev => prev.map(m =>
        m._id === userId ? { ...m, isOnline: true } : m
      ));
    });

    socket.on("member_offline", ({ userId }) => {
      setMembers(prev => prev.map(m =>
        m._id === userId ? { ...m, isOnline: false } : m
      ));
    });

    socket.on("comment_added", ({ taskId }) => {
      setColumns(prev => prev.map(col => ({
        ...col,
        tasks: col.tasks.map(t =>
          t._id === taskId
            ? { ...t, comments: [...(t.comments || []), 'placeholder'] }
            : t
        )
      })));
    });

    socket.on("member_joined", ({ boardId, member }) => {
      if (boardId === activeBoard?._id) {
        setMembers(prev => {
          // avoid duplicates
          if (prev.some(m => m._id === member._id)) return prev;
          return [...prev, member];
        });
      }
    });

    return () => {
      socket.emit("leave_board", activeBoard._id);
      socket.off("task_moved");
      socket.off("columns_reordered");
      socket.off("column_added");
      socket.off("column_deleted");
      socket.off("tasks_reordered");
      socket.off("task_created");
      socket.off("task_updated");
      socket.off("task_deleted");
      socket.off("member_online");
      socket.off("member_offline");
      socket.off("new_notification");
      socket.off("comment_added");
      socket.off("member_joined");
    };
  }, [activeBoard?._id]);

  const fetchBoards = async () => {
    try {
      const data = await getBoards();
      setBoards(data || []);
      if (data && data.length > 0) {
        const lastId = localStorage.getItem('lastActiveBoardId');
        const startId = data.find(b => b._id === lastId) ? lastId : data[0]._id;
        loadBoard(startId);
      }
      else setLoading(false);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
      } else {
        setError('Cannot connect to server.');
        setLoading(false);
      }
    }
  };

  const loadBoard = async (boardId) => {
    setSidebarOpen(false);
    setLoading(true);
    localStorage.setItem('lastActiveBoardId', boardId);
    try {
      const board = await getBoardById(boardId);
      setActiveBoard(board);
      console.log('board.user:', board.user);
      setColumns(normalizeTasks(board.columns || []));
      const membersData = await getBoardMembers(boardId);
      setMembers(Array.isArray(membersData) ? membersData : []);
    } catch (err) {
      setError('Failed to load board.');
    } finally {
      setLoading(false);
    }
  };

  const handleBoardCreated = (newBoard) => { setBoards(prev => [...prev, newBoard]); loadBoard(newBoard._id); };
  const handleBoardDeleted = (boardId) => {
    const remaining = boards.filter(b => b._id !== boardId);
    setBoards(remaining);
    if (remaining.length > 0) loadBoard(remaining[0]._id);
    else { setActiveBoard(null); setColumns([]); setMembers([]); }
  };
  const handleColumnAdded = (newColumn) => setColumns(prev => {
    if (prev.some(col => col._id === newColumn._id)) return prev;
    return [...prev, { ...newColumn, tasks: [] }];
  });
  const handleTaskCreated = (columnId, newTask) => {
    setColumns(prev => prev.map(col =>
      col._id === columnId
        ? { ...col, tasks: [...(col.tasks || []), { ...newTask, id: newTask._id }] }
        : col
    ));
  };
  const handleTaskDeleted = (taskId) => {
    setColumns(prev => prev.map(col => ({ ...col, tasks: col.tasks.filter(t => t._id !== taskId) })));
  };
  const handleTaskUpdated = (taskId, updatedTask) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      tasks: col.tasks.map(t => t._id === taskId ? { ...t, ...updatedTask, id: taskId } : t)
    })));
  };
  const handleColumnDeleted = (columnId) => setColumns(prev => prev.filter(col => col._id !== columnId));
  const handleMemberRemoved = (memberId) => setMembers(prev => prev.filter(m => m._id !== memberId));
  const handleInviteSent = async (boardId) => {
    const membersData = await getBoardMembers(boardId);
    setMembers(Array.isArray(membersData) ? membersData : []);
  };


  // Callback to update local columns state with bulk priority overrides from AI
  const handlePrioritiesUpdated = (updatedPriorities) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      tasks: col.tasks.map(task => {
        const match = updatedPriorities.find(p => p.id === task._id || p.id === task.id);
        return match ? { ...task, priority: match.priority } : task;
      })
    })));
  };

  const getColumnByTaskId = (taskId) =>
    columns.find(col => col.tasks.some(t => t.id === taskId || t._id === taskId));

  const handleDragStart = ({ active }) => {
    const isCol = columns.some(c => c._id === active.id);
    setActiveType(isCol ? 'column' : 'task');

    if (!isCol) {
      const sourceCol = columns.find(c => c.tasks.some(t => t.id === active.id || t._id === active.id));
      setDragSourceColId(sourceCol?._id || null);
    }
  };

  const handleDragOver = ({ active, over }) => {
    if (!over || activeType !== 'task' || active.id === over.id) return;
    const activeCol = getColumnByTaskId(active.id);
    if (!activeCol) return;
    let overColId;
    if (over.data.current?.type === 'column') overColId = over.id;
    else { const overCol = getColumnByTaskId(over.id); if (!overCol) return; overColId = overCol._id; }
    if (activeCol._id === overColId) return;
    setColumns(prev => {
      const task = activeCol.tasks.find(t => t.id === active.id);
      if (!task) return prev;
      return prev.map(col => {
        if (col._id === activeCol._id) return { ...col, tasks: col.tasks.filter(t => t.id !== active.id) };
        if (col._id === overColId) return { ...col, tasks: [...col.tasks, task] };
        return col;
      });
    });
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveType(null);
    if (!over) return;
    if (activeType === 'column') {
      if (active.id !== over.id) {
        const oldIndex = columns.findIndex(c => c._id === active.id);
        const newIndex = columns.findIndex(c => c._id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const newCols = arrayMove(columns, oldIndex, newIndex);
        setColumns(newCols);
        try { await reorderColumns(activeBoard._id, newCols.map(c => c._id)); }
        catch (err) { console.error('Column reorder failed:', err); }
      }
      return;
    }
    if (activeType === 'task') {
      const sourceCol = columns.find(c => c._id === dragSourceColId);
      if (!sourceCol) return;
      let destColId;
      if (over.data.current?.type === 'column') destColId = over.id;
      else destColId = getColumnByTaskId(over.id)?._id;
      if (!destColId) return;
      if (sourceCol._id === destColId) {
        const currentCol = columns.find(c => c._id === sourceCol._id);
        const oldIndex = currentCol.tasks.findIndex(t => t.id === active.id);
        const newIndex = currentCol.tasks.findIndex(t => t.id === over.id);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
        const newTasks = arrayMove(currentCol.tasks, oldIndex, newIndex);
        setColumns(prev => prev.map(col => col._id === sourceCol._id ? { ...col, tasks: newTasks } : col));
        try { await reorderTasks(sourceCol._id, newTasks.map(t => t._id)); }
        catch (err) { console.error('Task reorder failed:', err); }
        return;
      }

      try {
        await moveTask(active.id, sourceCol._id, destColId);

        // Check if destination is the "Done" column
        const destCol = columns.find(c => c._id === destColId);
        const isDone = destCol?.title?.toLowerCase() === 'done';

        // Update isDone visually without waiting for refresh
        setColumns(prev => prev.map(col => ({
          ...col,
          tasks: col.tasks.map(t =>
            t._id === active.id || t.id === active.id
              ? { ...t, isDone }
              : t
          )
        })));
      } catch (err) {
        console.error('Task move failed:', err);
      }
    }
  };

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <p className={`text-xl animate-pulse ${isDark ? 'text-white' : 'text-gray-700'}`}>Loading board...</p>
    </div>
  );

  if (error) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <p className="text-red-400 text-xl">{error}</p>
    </div>
  );

  const columnIds = columns.map(c => c._id);

  const inputClass = `px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200'
    }`;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-gray-200'}`}>
      <Navbar />

      <div className="flex flex-1">

        {sidebarOpen && (
          <Sidebar
            boards={boards}
            activeBoard={activeBoard}
            members={members}
            onBoardSelect={loadBoard}
            onBoardCreated={handleBoardCreated}
            onBoardDeleted={handleBoardDeleted}
            onMemberRemoved={handleMemberRemoved}
            onInviteSent={handleInviteSent}
            setShowCreateModal={setShowCreateModal}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden w-full">

          {/* Board header */}
          <div className={`px-8 py-5 border-b relative ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex justify-between items-stretch mb-4 min-h-[60px]">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(prev => !prev)}
                  className={`p-2 rounded-lg transition duration-200 ${sidebarOpen
                    ? isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'
                    : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
                    <line x1="9" y1="3" x2="9" y2="21" strokeWidth={2} />
                  </svg>
                </button>

                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className={`text-xl font-bold uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {activeBoard ? activeBoard.title : 'No boards yet'}
                    </h1>
                    {(activeBoard?.user?.username || activeBoard?.ownerUsername) && (
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        by {(activeBoard?.user?.username || activeBoard?.ownerUsername || '').charAt(0).toUpperCase() + (activeBoard?.user?.username || activeBoard?.ownerUsername || '').slice(1)}
                      </span>
                    )}
                  </div>
                  {(() => {
                    const total = columns.reduce((acc, col) => acc + (col.tasks || []).length, 0);
                    const done = columns
                      .filter(col => col.title?.toLowerCase() === 'done')
                      .reduce((acc, col) => acc + (col.tasks || []).length, 0);
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    return total > 0 ? (
                      <div className="flex items-center gap-3">
                        <div className={`w-48 h-1.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}>
                          <div
                            className={`h-1.5 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-400' : 'bg-pink-700'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{done}/{total} tasks</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pct === 100
                          ? 'bg-green-500 text-white'
                          : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-300 text-gray-700'
                          }`}>{pct}%</span>
                        {pct === 100 && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500 text-white">All done! </span>}
                      </div>
                    ) : (
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Track your team's progress</p>
                    );
                  })()}
                </div>
              </div>

              {!activeBoard && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-pink-700 hover:bg-pink-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
                >
                  + Create your first board
                </button>
              )}

              {activeBoard && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  <AddColumnButton boardId={activeBoard._id} onColumnAdded={handleColumnAdded} />
                </div>
              )}
            </div>

            {/* Filter bar — pill style */}
            {activeBoard && (
              <div className="flex items-center gap-2 flex-wrap px-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition duration-200 ${isDark ? 'border-gray-600 bg-gray-800 text-gray-400' : 'border-gray-200 bg-white text-gray-500'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={filter.search}
                    onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                    className="bg-transparent outline-none text-sm w-28 placeholder-gray-400"
                  />
                </div>

                <select
                  value={filter.priority}
                  onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value }))}
                  className={`px-3 py-1.5 rounded-full border text-sm transition duration-200 ${filter.priority
                    ? 'border-pink-500 text-pink-400 bg-pink-500/10'
                    : isDark ? 'border-gray-600 bg-gray-800 text-gray-400' : 'border-gray-200 bg-white text-gray-500'
                    }`}
                >
                  <option value="">Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  value={filter.assignee}
                  onChange={(e) => setFilter(prev => ({ ...prev, assignee: e.target.value }))}
                  className={`px-3 py-1.5 rounded-full border text-sm transition duration-200 ${filter.assignee
                    ? 'border-pink-500 text-pink-400 bg-pink-500/10'
                    : isDark ? 'border-gray-600 bg-gray-800 text-gray-400' : 'border-gray-200 bg-white text-gray-500'
                    }`}
                >
                  <option value="">Assignee</option>
                  {members.map(member => (
                    <option key={member._id} value={member._id}>{member.username}</option>
                  ))}
                </select>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition duration-200 ${filter.startDate
                  ? 'border-pink-500 text-pink-400 bg-pink-500/10'
                  : isDark ? 'border-gray-600 bg-gray-800 text-gray-400' : 'border-gray-200 bg-white text-gray-500'
                  }`}>
                  <span className="text-xs">Start</span>
                  <input
                    type="date"
                    value={filter.startDate}
                    onChange={(e) => setFilter(prev => ({ ...prev, startDate: e.target.value }))}
                    className="bg-transparent outline-none text-sm"
                  />
                </div>

                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition duration-200 ${filter.dueDate
                  ? 'border-pink-500 text-pink-400 bg-pink-500/10'
                  : isDark ? 'border-gray-600 bg-gray-800 text-gray-400' : 'border-gray-200 bg-white text-gray-500'
                  }`}>
                  <span className="text-xs">Due</span>
                  <input
                    type="date"
                    value={filter.dueDate}
                    onChange={(e) => setFilter(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="bg-transparent outline-none text-sm"
                  />
                </div>

                <select
                  value={filter.label}
                  onChange={(e) => setFilter(prev => ({ ...prev, label: e.target.value }))}
                  className={`px-3 py-1.5 rounded-full border text-sm transition duration-200 ${filter.label
                    ? 'border-pink-500 text-pink-400 bg-pink-500/10'
                    : isDark ? 'border-gray-600 bg-gray-800 text-gray-400' : 'border-gray-200 bg-white text-gray-500'
                    }`}
                >
                  <option value="">Label</option>
                  <option value="Bug">Bug</option>
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="Documentation">Documentation</option>
                  <option value="DevOps">DevOps</option>
                  <option value="Design">Design</option>
                  <option value="Testing">Testing</option>
                  <option value="Feature">Feature</option>
                  <option value="Other">Other</option>
                </select>

                {(filter.search || filter.priority || filter.assignee || filter.startDate || filter.dueDate || filter.label) && (
                  <button
                    onClick={() => setFilter({ priority: '', search: '', assignee: '', startDate: '', dueDate: '', label: '' })}
                    className={`px-3 py-1.5 rounded-full border text-xs transition duration-200 ${isDark ? 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-400' : 'border-gray-200 text-gray-400 hover:text-gray-900'}`}
                  >
                    Clear ×
                  </button>
                )}
              </div>
            )}
          </div>

          {activeBoard && (
            <div className="px-6">
              <AiBanner
                boardId={activeBoard._id}
                columns={columns}
                onPrioritiesUpdated={handlePrioritiesUpdated}
              />
            </div>
          )}

          {/* Empty state */}
          {boards.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              <p className={`text-xl ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No boards yet!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-pink-700 hover:bg-pink-800 text-white px-6 py-3 rounded-lg font-medium transition duration-200"
              >
                + Create your first board
              </button>
            </div>
          )}

          {/* Kanban Board */}
          {activeBoard && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                <div className="flex gap-4 p-6 overflow-x-auto touch-pan-x" style={{ width: '100%', boxSizing: 'border-box' }}>
                  {columns.map(column => (
                    <SortableColumnWrapper key={column._id} column={column}>
                      {({ dragHandleProps }) => (
                        <Column
                          id={column._id}
                          title={column.title}
                          color="bg-gray-400"
                          onTaskCreated={handleTaskCreated}
                          onTaskDeleted={handleTaskDeleted}
                          onTaskUpdated={handleTaskUpdated}
                          onColumnDeleted={handleColumnDeleted}
                          members={members}
                          dragHandleProps={dragHandleProps}
                          isOwner={isOwner}
                          tasks={(column.tasks || []).filter(task => {
                            const matchesPriority = !filter.priority || task.priority === filter.priority;
                            const matchesSearch = !filter.search || task.title.toLowerCase().includes(filter.search.toLowerCase());
                            const matchesAssignee = !filter.assignee || task.assignedTo?._id === filter.assignee || task.assignedTo === filter.assignee;
                            const matchesDueDate = !filter.dueDate || (task.dueDate && task.dueDate.split('T')[0] === filter.dueDate);
                            const matchesStartDate = !filter.startDate || (task.startDate && task.startDate.split('T')[0] === filter.startDate);
                            const matchesLabel = !filter.label || task.label === filter.label;
                            return matchesPriority && matchesSearch && matchesAssignee && matchesDueDate && matchesStartDate && matchesLabel;
                          })}
                        />
                      )}
                    </SortableColumnWrapper>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateBoardModal
          onClose={() => setShowCreateModal(false)}
          onBoardCreated={handleBoardCreated}
        />
      )}
    </div>
  );
}

export default BoardPage;