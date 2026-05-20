import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import Navbar from '../components/Navbar';
import Column from '../components/Column';

const BOARD_ID = 'YOUR_BOARD_ID_HERE'; // ← ask Asmaa for a real board ID

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

  // ← redirect to login if no token
  useEffect(() => {
    if (!token) {
      window.location.href = '/';
    }
  }, [token]);

  // ← fetch board data from Asmaa's API
  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/boards/${BOARD_ID}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/';
          return;
        }

        if (response.status === 403) {
          setError('You are not authorized to view this board.');
          return;
        }

        const data = await response.json();
        setColumns(data.columns); // ← nested structure from Asmaa
      } catch (err) {
        setError('Cannot connect to server. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };

    fetchBoard();
  }, [token]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const newColumnId = over.id;

    // Update UI instantly
    setColumns(prev =>
      prev.map(col => ({
        ...col,
        tasks: col.tasks
          .filter(t => t._id !== taskId)
          .concat(
            col.tasks.find(t => t._id === taskId)
              ? []
              : prev
                  .flatMap(c => c.tasks)
                  .filter(t => t._id === taskId)
                  .map(t => ({ ...t, columnId: newColumnId }))
          )
      }))
    );

    // Tell Asmaa's API about the move
    try {
      await fetch(`http://localhost:5000/api/tasks/${taskId}/move`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ columnId: newColumnId })
      });
    } catch (err) {
      console.error('Failed to save card move:', err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white text-xl">Loading board...</p>
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
                id: task._id,           // ← map _id to id for dnd-kit
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