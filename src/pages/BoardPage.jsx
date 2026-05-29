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
    <div ref={setNodeRef} style={style}>
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
    dueDate: ''
  });
  const [dragSourceColId, setDragSourceColId] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }));

  const token = localStorage.getItem('token');
  const tokenPayload = token ? JSON.parse(atob(token.split('.')[1])) : null;
  const currentUserId = tokenPayload?.id || tokenPayload?._id || tokenPayload?.userId;

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
  }
}, []);

useEffect(() => {
  if (!activeBoard) return;

  socket.emit("join_board", activeBoard._id);

  socket.on("task_moved", ({ taskId, sourceColumnId, destinationColumnId }) => {
    setColumns(prev => {
      const task = prev
        .find(col => col._id === sourceColumnId)
        ?.tasks.find(t => t._id === taskId || t.id === taskId);
      if (!task) return prev;
      return prev.map(col => {
        if (col._id === sourceColumnId)
          return { ...col, tasks: col.tasks.filter(t => t._id !== taskId && t.id !== taskId) };
        if (col._id === destinationColumnId)
          return { ...col, tasks: [...col.tasks, task] };
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
  };
}, [activeBoard?._id]);

  const fetchBoards = async () => {
    try {
      const data = await getBoards();
      setBoards(data || []);
      if (data && data.length > 0) loadBoard(data[0]._id);
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
    setLoading(true);
    try {
      const board = await getBoardById(boardId);
      setActiveBoard(board);
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
  const handleColumnAdded = (newColumn) => setColumns(prev => [...prev, { ...newColumn, tasks: [] }]);
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
      try { await moveTask(active.id, sourceCol._id, destColId); }
      catch (err) { console.error('Task move failed:', err); }
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

  const inputClass = `px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 ${
    isDark ? 'bg-gray-700 text-white placeholder-gray-500' : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200'
  }`;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
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

        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Board header */}
          <div className={`px-6 py-4 flex items-center justify-between border-b ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(prev => !prev)}
                className={`p-2 rounded-lg transition duration-200 flex flex-col gap-1 ${
                  sidebarOpen
                    ? isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900'
                    : isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                }`}
                title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                <span className="w-5 h-0.5 bg-current rounded"></span>
                <span className="w-5 h-0.5 bg-current rounded"></span>
                <span className="w-5 h-0.5 bg-current rounded"></span>
              </button>

              <div>
                <h1 className={`text-2xl font-bold uppercase ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {activeBoard ? activeBoard.title : 'No boards yet'}
                </h1>
                <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {columns.length > 0 ? (() => {
                    const total = columns.reduce((acc, col) => acc + (col.tasks || []).length, 0);
                    const done = columns
                      .filter(col => col.title?.toLowerCase() === 'done')
                      .reduce((acc, col) => acc + (col.tasks || []).length, 0);
                    return `${done}/${total} tasks done`;
                  })() : "Track your team's progress"}
                </p>
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
          </div>

          {/* Filter bar */}
          {activeBoard && (
            <div className={`px-6 py-3 flex items-center gap-3 border-b flex-wrap ${
              isDark ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <input
                type="text"
                placeholder="Search tasks..."
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                className={`${inputClass} w-44`}
              />
              <select
                value={filter.priority}
                onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value }))}
                className={inputClass}
              >
                <option value="">All priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={filter.assignee}
                onChange={(e) => setFilter(prev => ({ ...prev, assignee: e.target.value }))}
                className={inputClass}
              >
                <option value="">All assignees</option>
                {members.map(member => (
                  <option key={member._id} value={member._id}>{member.username}</option>
                ))}
              </select>
              <input
                type="date"
                value={filter.dueDate}
                onChange={(e) => setFilter(prev => ({ ...prev, dueDate: e.target.value }))}
                className={inputClass}
              />
              {(filter.search || filter.priority || filter.assignee || filter.dueDate) && (
                <button
                  onClick={() => setFilter({ priority: '', search: '', assignee: '', dueDate: '' })}
                  className={`text-sm transition duration-200 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  Clear ×
                </button>
              )}
              <div className="ml-auto flex-shrink-0">
                <AddColumnButton boardId={activeBoard._id} onColumnAdded={handleColumnAdded} />
              </div>
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
                <div className="flex gap-4 p-6 overflow-x-auto flex-1 touch-pan-x">
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
                          tasks={(column.tasks || []).filter(task => {
                            const matchesPriority = !filter.priority || task.priority === filter.priority;
                            const matchesSearch = !filter.search || task.title.toLowerCase().includes(filter.search.toLowerCase());
                            const matchesAssignee = !filter.assignee || task.assignedTo?._id === filter.assignee || task.assignedTo === filter.assignee;
                            const matchesDueDate = !filter.dueDate || (task.dueDate && task.dueDate.split('T')[0] === filter.dueDate);
                            return matchesPriority && matchesSearch && matchesAssignee && matchesDueDate;
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