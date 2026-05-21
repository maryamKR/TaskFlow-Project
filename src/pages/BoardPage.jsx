import { useState, useEffect } from 'react';
import {
  DndContext, closestCorners,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import Navbar from '../components/Navbar';
import Column from '../components/Column';
import CreateBoardModal from '../components/CreateBoardModal';
import AddColumnButton from '../components/AddColumnButton';
import { getBoards, getBoardById, moveTask } from '../services/board';

const priorityColors = {
  High: 'text-red-400',
  Med: 'text-yellow-400',
  Low: 'text-green-400',
  Done: 'text-green-400',
};

function BoardPage() {
  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      window.location.href = '/';
      return;
    }
    fetchBoards();
  }, [token]);

  const fetchBoards = async () => {
    try {
      const data = await getBoards();
      setBoards(data || []);
      if (data && data.length > 0) {
        loadBoard(data[0]._id);
      } else {
        setLoading(false);
      }
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

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const newColumnId = over.id;

    setColumns(prev =>
      prev.map(col => {
        const hasTask = col.tasks.some(t => t._id === taskId);
        if (hasTask) {
          return { ...col, tasks: col.tasks.filter(t => t._id !== taskId) };
        }
        const task = prev.flatMap(c => c.tasks).find(t => t._id === taskId);
        if (col._id === newColumnId && task) {
          return { ...col, tasks: [...col.tasks, task] };
        }
        return col;
      })
    );

    try {
      await moveTask(taskId, newColumnId);
    } catch (err) {
      console.error('Failed to save move:', err);
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

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />

      {/* Board Header */}
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
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200"
        >
          + New Board
        </button>
      </div>

      {/* Empty state */}
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

      {/* Kanban columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 px-6 pb-6 overflow-x-auto">
          {columns.map(column => (
            <Column
              key={column._id}
              id={column._id}
              title={column.title}
              color="bg-gray-400"
              onTaskCreated={handleTaskCreated}
              tasks={(column.tasks || []).map(task => ({
                ...task,
                id: task._id,
                priorityColor: priorityColors[task.priority] || 'text-gray-400',
              }))}
            />
          ))}
          {activeBoard && (
            <AddColumnButton
              boardId={activeBoard._id}
              onColumnAdded={handleColumnAdded}
            />
          )}
        </div>
      </DndContext>

      {/* Create Board Modal */}
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