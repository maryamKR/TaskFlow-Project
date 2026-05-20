import { useState, useEffect } from 'react';
import {
  DndContext, closestCorners,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import Navbar from '../components/Navbar';
import Column from '../components/Column';
import { getBoards, getBoardById, moveTask } from '../services/board';

const labelColors = {
  UI: 'bg-purple-900 text-purple-300',
  DB: 'bg-blue-900 text-blue-300',
  BE: 'bg-green-900 text-green-300',
  AI: 'bg-yellow-900 text-yellow-300',
  FE: 'bg-purple-900 text-purple-300',
};

const priorityColors = {
  High: 'text-red-400',
  Med: 'text-yellow-400',
  Low: 'text-green-400',
  Done: 'text-green-400',
};

function BoardPage() {
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      window.location.href = '/';
      return;
    }

    const fetchData = async () => {
      try {
        // Step 1: get all boards & log them
        const boards = await getBoards();
        console.log('📋 Available boards:', boards);

        if (!boards || boards.length === 0) {
          setError('No boards found. Ask Asmaa to create one!');
          return;
        }

        // Step 2: use first board automatically
        const boardId = boards[0]._id;
        const board = await getBoardById(boardId);
        console.log('📌 Board data:', board);

        setColumns(board.columns);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/';
        } else {
          setError('Cannot connect to server. Is the backend running?');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

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
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Code Arena — Dev Board</h1>
          <p className="text-gray-400 text-sm mt-1">Track your team's progress</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200">
          + Add Task
        </button>
      </div>

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
              tasks={column.tasks.map(task => ({
                ...task,
                id: task._id,
                labelColor: labelColors[task.label] || 'bg-gray-700 text-gray-300',
                priorityColor: priorityColors[task.priority] || 'text-gray-400',
              }))}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

export default BoardPage;