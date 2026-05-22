import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Navbar from '../components/Navbar';
import Column from '../components/Column';
import CreateBoardModal from '../components/CreateBoardModal';
import AddColumnButton from '../components/AddColumnButton';
import InviteMemberModal from '../components/InviteMemberModal';
import {
  getBoards, getBoardById, getBoardMembers,
  moveTask, reorderColumns, reorderTasks
} from '../services/board';

const priorityColors = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-green-400',
};

function SortableColumnWrapper({ column, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
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
  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null); // { type, data }

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }));

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { window.location.href = '/'; return; }
    fetchBoards();
  }, [token]);

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
      setColumns(board.columns || []);
      const membersData = await getBoardMembers(boardId);
      setMembers(Array.isArray(membersData) ? membersData : []);
    } catch (err) {
      setError('Failed to load board.');
    } finally {
      setLoading(false);
    }
  };

  const handleBoardCreated = (newBoard) => {
    setBoards(prev => [...prev, newBoard]);
    loadBoard(newBoard._id);
  };

  const handleColumnAdded = (newColumn) => {
    setColumns(prev => [...prev, newColumn]);
  };

  const handleTaskCreated = (columnId, newTask) => {
    setColumns(prev =>
      prev.map(col =>
        col._id === columnId
          ? { ...col, tasks: [...(col.tasks || []), { ...newTask, id: newTask._id }] }
          : col
      )
    );
  };

  const handleTaskDeleted = (taskId) => {
    setColumns(prev =>
      prev.map(col => ({
        ...col,
        tasks: col.tasks.filter(t => t._id !== taskId)
      }))
    );
  };

  const getColumnByTaskId = (taskId) =>
    columns.find(col => col.tasks.some(t => t.id === taskId || t._id === taskId));

  const getColumnById = (colId) =>
    columns.find(col => col._id === colId);

  const handleDragStart = ({ active }) => {
    const type = active.data.current?.type;
    if (type === 'column') {
      setActiveItem({ type: 'column', data: columns.find(c => c._id === active.id) });
    } else {
      const col = getColumnByTaskId(active.id);
      const task = col?.tasks.find(t => t.id === active.id);
      setActiveItem({ type: 'task', data: task });
    }
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    const activeType = active.data.current?.type;
    if (activeType === 'column') return; // columns handled in dragEnd

    // Task dragging over a different column
    const activeCol = getColumnByTaskId(active.id);
    if (!activeCol) return;

    let overColId;
    if (over.data.current?.type === 'column') {
      overColId = over.id;
    } else {
      // over a task — find its column
      const overCol = getColumnByTaskId(over.id);
      if (!overCol) return;
      overColId = overCol._id;
    }

    if (activeCol._id === overColId) return;

    // Move task to new column visually
    setColumns(prev => {
      const task = activeCol.tasks.find(t => t.id === active.id);
      if (!task) return prev;
      return prev.map(col => {
        if (col._id === activeCol._id) {
          return { ...col, tasks: col.tasks.filter(t => t.id !== active.id) };
        }
        if (col._id === overColId) {
          return { ...col, tasks: [...col.tasks, task] };
        }
        return col;
      });
    });
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveItem(null);
    if (!over) return;

    const activeType = active.data.current?.type;

    // ── Column reorder ──────────────────
    if (activeType === 'column') {
      if (active.id === over.id) return;
      const oldIndex = columns.findIndex(c => c._id === active.id);
      const newIndex = columns.findIndex(c => c._id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const newCols = arrayMove(columns, oldIndex, newIndex);
      setColumns(newCols);
      try {
        await reorderColumns(activeBoard._id, newCols.map(c => c._id));
      } catch (err) {
        console.error('Column reorder failed:', err);
      }
      return;
    }

    // ── Task dropped ────────────────────
    const sourceCol = getColumnByTaskId(active.id);
    if (!sourceCol) return;

    let destColId;
    if (over.data.current?.type === 'column') {
      destColId = over.id;
    } else {
      const overCol = getColumnByTaskId(over.id);
      destColId = overCol?._id;
    }

    if (!destColId) return;

    // Same column → reorder
    if (sourceCol._id === destColId) {
      const currentCol = columns.find(c => c._id === sourceCol._id);
      const oldIndex = currentCol.tasks.findIndex(t => t.id === active.id);
      const newIndex = currentCol.tasks.findIndex(t => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const newTasks = arrayMove(currentCol.tasks, oldIndex, newIndex);
      setColumns(prev => prev.map(col =>
        col._id === sourceCol._id ? { ...col, tasks: newTasks } : col
      ));
      try {
        await reorderTasks(sourceCol._id, newTasks.map(t => t._id));
      } catch (err) {
        console.error('Task reorder failed:', err);
      }
      return;
    }

    // Different column → already moved visually in onDragOver, just save
    try {
      await moveTask(active.id, sourceCol._id, destColId);
    } catch (err) {
      console.error('Task move failed:', err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white text-xl animate-pulse">Loading board...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-red-400 text-xl">{error}</p>
    </div>
  );

  const columnIds = columns.map(c => c._id);

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />

      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {boards.length > 0 && (
            <select
              onChange={(e) => loadBoard(e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {boards.map(board => (
                <option key={board._id} value={board._id}>
                  {board.title}
                </option>
              ))}
            </select>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">
              {activeBoard ? activeBoard.title : 'No boards yet'}
            </h1>
            <p className="text-gray-400 text-sm mt-1">Track your team's progress</p>
          </div>
        </div>

        <div className="flex gap-3">
          {activeBoard && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
            >
              👥 Invite Member
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
          >
            + New Board
          </button>
        </div>
      </div>

      {boards.length === 0 && (
        <div className="flex flex-col items-center justify-center mt-32 gap-4">
          <p className="text-gray-400 text-xl">No boards yet!</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition duration-200"
          >
            + Create your first board
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-4 px-6 pb-6 overflow-x-auto">
            {columns.map(column => (
              <SortableColumnWrapper key={column._id} column={column}>
                {({ dragHandleProps }) => (
                  <Column
                    id={column._id}
                    title={column.title}
                    color="bg-gray-400"
                    onTaskCreated={handleTaskCreated}
                    onTaskDeleted={handleTaskDeleted}
                    members={members}
                    dragHandleProps={dragHandleProps}
                    tasks={(column.tasks || []).map(task => ({
                      ...task,
                      id: task._id,
                      priorityColor: priorityColors[task.priority] || 'text-gray-400',
                    }))}
                  />
                )}
              </SortableColumnWrapper>
            ))}
            {activeBoard && (
              <AddColumnButton
                boardId={activeBoard._id}
                onColumnAdded={handleColumnAdded}
              />
            )}
          </div>
        </SortableContext>
      </DndContext>

      {showCreateModal && (
        <CreateBoardModal
          onClose={() => setShowCreateModal(false)}
          onBoardCreated={handleBoardCreated}
        />
      )}

      {showInviteModal && activeBoard && (
        <InviteMemberModal
          boardId={activeBoard._id}
          onClose={() => setShowInviteModal(false)}
          onMembersUpdated={setMembers}
        />
      )}
    </div>
  );
}

export default BoardPage;